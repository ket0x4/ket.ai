import { CONFIG } from "../config";
import { ai } from "../services/gemini/client";
import { runWithRetry } from "../services/gemini/utils";
import { openAiProvider } from "../services/llm/openAiProvider";
import type { ChatMessage } from "../services/llm/types";
import logger from "../utils/logger";
import type { AgentEvent, AgentEventHandler } from "./events";
import {
	executeFunctionCallsInParallel,
	type ToolExecutionOptions,
} from "./executor";
import { extractFunctionCalls, type RawFunctionCall } from "./functionCalls";
import { toolRegistry } from "./registry";
import { getPlan } from "./tools/plan";
import { AgentTraceLogger } from "./trace";

function convertToolParts(
	toolParts: Array<Record<string, unknown>>,
	text: string,
): ChatMessage[] {
	const out: ChatMessage[] = [];
	for (const tp of toolParts) {
		const result = (tp.response as { result?: unknown })?.result ?? tp.response;
		out.push({
			role: "tool",
			toolName: typeof tp.name === "string" ? tp.name : undefined,
			toolCallId: typeof tp.id === "string" ? tp.id : undefined,
			content:
				typeof result === "string" ? result : JSON.stringify(result ?? {}),
		});
	}
	if (text) {
		out.push({ role: "user", content: text });
	}
	return out;
}

function convertUserParts(
	parts: Array<Record<string, unknown>>,
): ChatMessage[] {
	let text = "";
	let media: { buffer: Buffer; mimeType: string } | undefined;
	const toolParts: Array<Record<string, unknown>> = [];

	for (const part of parts) {
		if (typeof part.text === "string") {
			text = text ? `${text}\n${part.text}` : part.text;
		} else if (part.inlineData) {
			const inline = part.inlineData as { data: string; mimeType: string };
			media = {
				buffer: Buffer.from(inline.data, "base64"),
				mimeType: inline.mimeType,
			};
		} else if (part.functionResponse) {
			toolParts.push(part.functionResponse as Record<string, unknown>);
		}
	}

	if (toolParts.length > 0) {
		return convertToolParts(toolParts, text);
	}
	return [{ role: "user", content: text || null, media }];
}

function convertModelParts(parts: Array<Record<string, unknown>>): ChatMessage {
	let text = "";
	const toolCalls: RawFunctionCall[] = [];

	for (const part of parts) {
		if (typeof part.text === "string") {
			text = text ? `${text}\n${part.text}` : part.text;
		} else if (part.functionCall) {
			const fc = part.functionCall as {
				id?: string;
				name: string;
				args?: Record<string, unknown>;
			};
			toolCalls.push({
				id: fc.id,
				name: fc.name,
				args: fc.args || {},
			});
		}
	}

	return {
		role: "assistant",
		content: text || null,
		toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
	};
}

function convertSingleContentEntry(
	entry: Record<string, unknown>,
): ChatMessage[] {
	const role = String(entry.role || "");
	if (
		!entry.parts &&
		(entry.content !== undefined || entry.toolCalls || role === "tool")
	) {
		return [entry as unknown as ChatMessage];
	}

	const parts = Array.isArray(entry.parts)
		? (entry.parts as Array<Record<string, unknown>>)
		: [];

	if (role === "user") {
		return convertUserParts(parts);
	}
	if (role === "model" || role === "assistant") {
		return [convertModelParts(parts)];
	}
	return [];
}

function convertContentsToChatMessages(
	contents: Array<Record<string, unknown>>,
): ChatMessage[] {
	return contents.flatMap(convertSingleContentEntry);
}

type AgentLoopOptions = ToolExecutionOptions;

// Provider finish reasons that mean the model refused or was filtered rather
// than simply choosing to answer without tools.
const BLOCKING_FINISH_REASONS = new Set([
	"SAFETY",
	"RECITATION",
	"BLOCKLIST",
	"PROHIBITED_CONTENT",
	"SPII",
	"IMAGE_SAFETY",
]);

// Compaction thresholds: individual text parts and tool results older than the
// most recent steps are shrunk to keep the running context bounded.
const COMPACT_TEXT_PART_LIMIT = 2500;
const COMPACT_TOOL_RESULT_LIMIT = 1500;
const COMPACT_KEEP_RECENT_TURNS = 6;

function generateTraceId(): string {
	return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface NoToolCallOutcome {
	text: string;
	blocked: boolean;
}

/**
 * Inspects a model turn that requested no tools: extracts text, logs provider
 * finish/block diagnostics, and reports whether the response was blocked.
 */
function inspectNoToolCallResponse(
	response: {
		text?: string;
		candidates?: Array<{ finishReason?: unknown }>;
		promptFeedback?: { blockReason?: unknown };
		choices?: Array<{
			finish_reason?: unknown;
			message?: { content?: unknown };
		}>;
	},
	traceId: string,
	step: number,
): NoToolCallOutcome {
	const text =
		response.text?.trim() ||
		(typeof response.choices?.[0]?.message?.content === "string"
			? (response.choices[0].message.content as string).trim()
			: "");
	const finishReason = String(
		response.candidates?.[0]?.finishReason ??
			response.choices?.[0]?.finish_reason ??
			"",
	);
	const blockReason = response.promptFeedback?.blockReason
		? String(response.promptFeedback.blockReason)
		: undefined;
	const blocked =
		Boolean(blockReason) ||
		BLOCKING_FINISH_REASONS.has(finishReason) ||
		finishReason === "content_filter";

	if (!text) {
		logger.warn(
			`[Agent:${traceId}] Model returned no tool calls and no text at step ${step} (finishReason=${finishReason || "unknown"}, blockReason=${blockReason ?? "none"}).`,
		);
	} else if (finishReason === "MAX_TOKENS" || finishReason === "length") {
		logger.warn(
			`[Agent:${traceId}] Response truncated at MAX_TOKENS; using partial text.`,
		);
	} else if (blocked) {
		logger.warn(
			`[Agent:${traceId}] Response flagged by the provider (finishReason=${finishReason || "unknown"}, blockReason=${blockReason ?? "none"}); using available text.`,
		);
	}

	return { text, blocked };
}

/**
 * Stable identity for a tool call: name plus a canonicalized argument payload,
 * so re-issued identical calls can be detected and suppressed.
 */
function fingerprintToolCall(fc: RawFunctionCall): string {
	const args = fc.args ?? {};
	let serialized: string;
	try {
		serialized = JSON.stringify(sortedKeys(args));
	} catch {
		serialized = JSON.stringify(args);
	}
	return `${fc.name}::${serialized}`;
}

function sortedKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortedKeys);
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			out[key] = sortedKeys((value as Record<string, unknown>)[key]);
		}
		return out;
	}
	return value;
}

/**
 * Shrinks older tool results and oversized text parts so a long tool-running
 * conversation does not blow past the model's context window. The most recent
 * turns are always preserved intact; only the first (task payload) entry and
 * the newest turns are guaranteed to survive untouched.
 */
function compactContents(
	contents: Array<Record<string, unknown>>,
	maxChars: number,
	keepRecentTurns: number = COMPACT_KEEP_RECENT_TURNS,
): Array<Record<string, unknown>> {
	if (contents.length <= keepRecentTurns + 1) return contents;

	let size = 0;
	try {
		size = JSON.stringify(contents).length;
	} catch {
		return contents;
	}
	if (size <= maxChars) return contents;

	const cutoff = Math.max(1, contents.length - keepRecentTurns);
	for (let i = 1; i < cutoff; i++) {
		contents[i] = compactEntry(contents[i]);
	}
	logger.info(
		`[Agent] Compacted context from ~${size} chars (kept last ${keepRecentTurns} turns).`,
	);
	return contents;
}

function compactEntry(entry: Record<string, unknown>): Record<string, unknown> {
	const parts = Array.isArray(entry.parts)
		? (entry.parts as Array<Record<string, unknown>>)
		: null;
	if (!parts) return entry;

	const compactedParts = parts.map((part) => {
		if (!part || typeof part !== "object") return part;
		if (
			typeof part.text === "string" &&
			part.text.length > COMPACT_TEXT_PART_LIMIT
		) {
			return {
				...part,
				text: `${part.text.slice(0, COMPACT_TEXT_PART_LIMIT)}\n[... earlier text compacted ...]`,
			};
		}
		const functionResponse = part.functionResponse as
			| { response?: unknown }
			| undefined;
		if (functionResponse) {
			let serialized = "";
			try {
				serialized = JSON.stringify(functionResponse.response ?? {});
			} catch {
				serialized = "";
			}
			if (serialized.length > COMPACT_TOOL_RESULT_LIMIT) {
				return {
					...part,
					functionResponse: {
						...functionResponse,
						response: {
							result: {
								note: "Earlier tool result compacted to save context.",
								original_size: serialized.length,
							},
						},
					},
				};
			}
		}
		return part;
	});

	return { ...entry, parts: compactedParts };
}

/**
 * Per-step guidance appended to the system instruction: run budget plus the
 * current working plan, so the model knows how much room it has and stays on
 * track on long tasks.
 */
function buildStepGuidance(
	step: number,
	maxSteps: number,
	plan: string[] = [],
): string {
	const remaining = Math.max(0, maxSteps - step);
	let guidance = `\n\n### RUN BUDGET ###\nThis is step ${step} of ${maxSteps}. `;
	guidance +=
		remaining <= 1
			? "This is your final step: stop calling tools and answer the user with what you have."
			: `You have ${remaining} step(s) left. Do not repeat identical tool calls; combine work and converge on a final answer.`;
	if (plan.length > 0) {
		guidance += `\nCurrent plan:\n${plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
	}
	return guidance;
}

function buildSuppressedResponse(
	fc: RawFunctionCall,
	note: string,
): Record<string, unknown> {
	const functionResponse: Record<string, unknown> = {
		name: fc.name,
		response: {
			result: {
				error: "duplicate_tool_call_suppressed",
				system_note: note,
			},
		},
	};
	if (fc.id) functionResponse.id = fc.id;
	return { functionResponse };
}

function resultIsFailure(part: Record<string, unknown>): boolean {
	const functionResponse = part.functionResponse as
		| { response?: { result?: unknown } }
		| undefined;
	const result = functionResponse?.response?.result;
	if (!result || typeof result !== "object") return false;
	const record = result as { error?: unknown; success?: unknown };
	return Boolean(record.error) || record.success === false;
}

function toolNameOf(part: Record<string, unknown>): string | undefined {
	const functionResponse = part.functionResponse as
		| { name?: string }
		| undefined;
	return functionResponse?.name;
}

/**
 * Runs a final tool-less model turn to summarize the work when the loop ended
 * after tool execution without producing any user-facing text.
 */
async function generateFinalSummary(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<string> {
	if (CONFIG.LLM_PROVIDER === "openai") {
		const messages = convertContentsToChatMessages(contents);
		const result = await openAiProvider.chat(messages, {
			systemInstruction: genConfig.systemInstruction as string | undefined,
			maxTokens: 2048,
			signal,
		});
		return result.text;
	}

	const finalGenConfig = {
		...genConfig,
		tools: undefined,
		maxOutputTokens: 2048,
		abortSignal: signal,
	};
	const finalResponse = await runWithRetry(() =>
		ai.models.generateContent({
			model: CONFIG.GEMINI_MODEL,
			// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
			contents: contents as any,
			// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
			config: finalGenConfig as any,
		}),
	);
	return finalResponse.text?.trim() || "";
}

/**
 * When the loop exhausted its steps after running tools without producing text,
 * ask the model once more (tool-less) for a short summary. Errors are non-fatal.
 */
async function finalizeAfterToolExecution(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	responseText: string,
	executedTools: boolean,
	signal: AbortSignal | undefined,
	traceId: string,
): Promise<string> {
	if (responseText || !executedTools || signal?.aborted) {
		return responseText;
	}
	try {
		logger.info(
			`[Agent:${traceId}] Tool execution finished at step limit. Generating final summary reply...`,
		);
		return await generateFinalSummary(contents, genConfig, signal);
	} catch (err) {
		logger.warn(
			`[Agent:${traceId}] Error generating final summary after tool execution:`,
			err,
		);
		return responseText;
	}
}

interface PartitionedToolCalls {
	toRun: RawFunctionCall[];
	responses: Map<RawFunctionCall, Record<string, unknown>>;
	suppressed: Array<{ toolName: string; reason: string }>;
}

/**
 * Splits requested tool calls into those that should run and repeated identical
 * calls that must be suppressed, while tracking occurrence counts.
 */
function partitionToolCalls(
	functionCalls: RawFunctionCall[],
	callCounts: Map<string, number>,
): PartitionedToolCalls {
	const toRun: RawFunctionCall[] = [];
	const responses = new Map<RawFunctionCall, Record<string, unknown>>();
	const suppressed: Array<{ toolName: string; reason: string }> = [];

	for (const fc of functionCalls) {
		const fingerprint = fingerprintToolCall(fc);
		const count = (callCounts.get(fingerprint) || 0) + 1;
		callCounts.set(fingerprint, count);

		if (count > CONFIG.MAX_IDENTICAL_TOOL_CALLS) {
			suppressed.push({
				toolName: fc.name,
				reason: `Identical call repeated ${count} times; suppressed.`,
			});
			responses.set(
				fc,
				buildSuppressedResponse(
					fc,
					"You already called this tool with identical arguments. Do not repeat it; use the result you already have or give your final answer now.",
				),
			);
		} else {
			toRun.push(fc);
		}
	}

	return { toRun, responses, suppressed };
}

interface FailureEscalation {
	toolName: string;
	count: number;
	note: string;
}

/**
 * Tracks consecutive failures per tool and returns an escalation notice once a
 * tool has failed `MAX_TOOL_FAILURES_PER_TOOL` times in a row.
 */
function trackFailures(
	ranParts: Array<Record<string, unknown>>,
	toRun: RawFunctionCall[],
	failureCounts: Map<string, number>,
): FailureEscalation[] {
	const escalations: FailureEscalation[] = [];

	ranParts.forEach((part, index) => {
		const name = toolNameOf(part) || toRun[index]?.name || "unknown";
		if (!resultIsFailure(part)) {
			failureCounts.set(name, 0);
			return;
		}
		const failures = (failureCounts.get(name) || 0) + 1;
		failureCounts.set(name, failures);
		if (failures === CONFIG.MAX_TOOL_FAILURES_PER_TOOL) {
			escalations.push({
				toolName: name,
				count: failures,
				note: `Tool '${name}' has now failed ${failures} times in a row. Stop retrying it with the same approach: try a fundamentally different method, or explain the blocker and give your best answer with the information you already have.`,
			});
		}
	});

	return escalations;
}

interface ToolStepInput {
	contents: Array<Record<string, unknown>>;
	functionCalls: RawFunctionCall[];
	response: { candidates?: Array<{ content?: unknown }> };
	stepOptions: AgentLoopOptions;
	step: number;
	traceId: string;
	callCounts: Map<string, number>;
	failureCounts: Map<string, number>;
	dispatch: (event: AgentEvent) => Promise<void>;
}

/**
 * Executes one tool step: records the model turn, suppresses duplicate calls,
 * runs the rest in parallel, tracks failures, and appends the tool responses
 * (plus any escalation notice) back into `contents`.
 */
async function processToolStep(
	input: ToolStepInput,
): Promise<{ aborted: boolean; ranAny: boolean }> {
	const {
		contents,
		functionCalls,
		response,
		stepOptions,
		step,
		traceId,
		callCounts,
		failureCounts,
		dispatch,
	} = input;

	const modelContent = response.candidates?.[0]?.content as
		| Record<string, unknown>
		| undefined;
	contents.push(
		modelContent ?? {
			role: "model",
			parts: functionCalls.map((fc) => ({ functionCall: fc })),
		},
	);

	const { toRun, responses, suppressed } = partitionToolCalls(
		functionCalls,
		callCounts,
	);
	for (const entry of suppressed) {
		logger.warn(
			`[Agent:${traceId}] Suppressed duplicate tool call '${entry.toolName}'.`,
		);
		await dispatch({
			type: "loop-detected",
			toolName: entry.toolName,
			step,
			reason: entry.reason,
		});
		AgentTraceLogger.add({
			traceId,
			kind: "loop-detected",
			step,
			detail: `duplicate call suppressed: ${entry.toolName}`,
		});
	}

	const ranParts =
		toRun.length > 0
			? await executeFunctionCallsInParallel(toRun, stepOptions, step)
			: [];
	toRun.forEach((fc, index) => {
		responses.set(fc, ranParts[index]);
	});

	const escalations = trackFailures(ranParts, toRun, failureCounts);
	for (const escalation of escalations) {
		AgentTraceLogger.add({
			traceId,
			kind: "loop-detected",
			step,
			detail: `repeated failures: ${escalation.toolName} x${escalation.count}`,
		});
	}

	const orderedParts = functionCalls
		.map((fc) => responses.get(fc))
		.filter((part): part is Record<string, unknown> => Boolean(part));
	if (escalations.length > 0) {
		orderedParts.push({
			text: `### AGENT NOTICE ###\n${escalations.map((e) => e.note).join("\n")}`,
		});
	}
	contents.push({ role: "user", parts: orderedParts });

	AgentTraceLogger.add({
		traceId,
		kind: "step-complete",
		step,
		toolCount: toRun.length,
		suppressedCount: suppressed.length,
	});
	await dispatch({
		type: "step-complete",
		step,
		toolCount: toRun.length,
		suppressedCount: suppressed.length,
	});

	return {
		aborted: Boolean(stepOptions.signal?.aborted),
		ranAny: toRun.length > 0,
	};
}

function makeEventDispatcher(
	onEvent: AgentEventHandler | undefined,
	traceId: string,
): (event: AgentEvent) => Promise<void> {
	return async (event: AgentEvent) => {
		if (!onEvent) return;
		try {
			await onEvent(event);
		} catch (err) {
			logger.warn(`[Agent:${traceId}] Event handler error:`, err);
		}
	};
}

function buildStepConfig(
	genConfig: Record<string, unknown>,
	step: number,
	maxSteps: number,
	plan: string[],
): Record<string, unknown> {
	const base =
		typeof genConfig.systemInstruction === "string"
			? genConfig.systemInstruction
			: "";
	return {
		...genConfig,
		systemInstruction: `${base}${buildStepGuidance(step, maxSteps, plan)}`,
	};
}

interface ModelStepResponse {
	text?: string;
	candidates?: Array<{ content?: unknown; finishReason?: unknown }>;
	promptFeedback?: { blockReason?: unknown };
	toolCalls?: RawFunctionCall[];
	raw?: unknown;
}

interface NoToolCallTurn {
	action: "retry" | "break";
	text: string;
}

function resolveNoToolCallTurn(
	response: ModelStepResponse,
	traceId: string,
	step: number,
	alreadyRetried: boolean,
): NoToolCallTurn {
	const outcome = inspectNoToolCallResponse(response, traceId, step);
	if (!outcome.text && outcome.blocked && !alreadyRetried) {
		return { action: "retry", text: outcome.text };
	}
	return { action: "break", text: outcome.text };
}

interface LoopContext {
	traceId: string;
	sessionId: string;
	stepOptions: AgentLoopOptions;
}

function resolveLoopContext(options: AgentLoopOptions): LoopContext {
	const traceId = options.traceId || generateTraceId();
	const sessionId = options.sessionId || options.chatId || "default";
	return { traceId, sessionId, stepOptions: { ...options, traceId } };
}

/**
 * Advances the duplicate-stall counter. A run that produced no fresh tool
 * executions twice in a row is treated as stuck and should end.
 */
function nextStallCount(
	stallCount: number,
	ranAny: boolean,
): { count: number; end: boolean } {
	if (ranAny) return { count: 0, end: false };
	const count = stallCount + 1;
	return { count, end: count >= 2 };
}

async function callModelForStep(
	compactedContents: Array<Record<string, unknown>>,
	stepConfig: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<ModelStepResponse> {
	if (CONFIG.LLM_PROVIDER === "openai") {
		const chatMessages = convertContentsToChatMessages(compactedContents);
		const tools =
			toolRegistry.count > 0
				? toolRegistry.getFunctionDeclarations()
				: undefined;
		const isJson = !tools && stepConfig.responseMimeType === "application/json";
		return await openAiProvider.chat(chatMessages, {
			systemInstruction: stepConfig.systemInstruction as string | undefined,
			tools,
			maxTokens:
				typeof stepConfig.maxOutputTokens === "number"
					? stepConfig.maxOutputTokens
					: 2048,
			responseFormat: isJson ? "json" : "text",
			signal,
		});
	}

	return (await runWithRetry(() =>
		ai.models.generateContent({
			model: CONFIG.GEMINI_MODEL,
			// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
			contents: compactedContents as any,
			// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
			config: { ...stepConfig, abortSignal: signal } as any,
		}),
	)) as ModelStepResponse;
}

/**
 * Drives the multi-turn agent loop: invoking the model, executing requested
 * tools in parallel, feeding results back, and honoring cancellation.
 *
 * Guards against two classic agent failure modes:
 *  - repeated identical tool calls (suppressed after `MAX_IDENTICAL_TOOL_CALLS`)
 *  - a tool failing over and over (`MAX_TOOL_FAILURES_PER_TOOL`)
 * and keeps the running context bounded via `compactContents`.
 */
export async function runAgentLoop(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	options: AgentLoopOptions = {},
): Promise<string> {
	const { signal } = options;
	const { traceId, sessionId, stepOptions } = resolveLoopContext(options);
	const maxSteps = CONFIG.MAX_AGENT_STEPS;
	const dispatch = makeEventDispatcher(options.onEvent, traceId);

	let responseText = "";
	let executedTools = false;
	let retriedBlockedResponse = false;
	let stallCount = 0;

	const callCounts = new Map<string, number>();
	const failureCounts = new Map<string, number>();

	AgentTraceLogger.add({
		traceId,
		kind: "step-start",
		step: 0,
		detail: "loop began",
	});

	for (let step = 1; step <= maxSteps; step++) {
		if (signal?.aborted) {
			logger.info(`[Agent:${traceId}] Aborted before step ${step}.`);
			return responseText;
		}

		await dispatch({ type: "step-start", step, maxSteps });
		AgentTraceLogger.add({ traceId, kind: "step-start", step });

		const stepConfig = buildStepConfig(
			genConfig,
			step,
			maxSteps,
			getPlan(sessionId),
		);

		const compactedContents = compactContents(
			contents,
			CONFIG.AGENT_CONTEXT_MAX_CHARS,
		);
		const response = await callModelForStep(
			compactedContents,
			stepConfig,
			signal,
		);

		const functionCalls = extractFunctionCalls(response);
		if (functionCalls.length === 0) {
			const turn = resolveNoToolCallTurn(
				response,
				traceId,
				step,
				retriedBlockedResponse,
			);
			responseText = turn.text;
			if (turn.action === "retry") {
				retriedBlockedResponse = true;
				continue;
			}
			executedTools = false;
			break;
		}

		executedTools = true;
		logger.info(
			`[Agent:${traceId}] Gemini requested ${functionCalls.length} tool call(s) at step ${step}`,
		);

		const { aborted, ranAny } = await processToolStep({
			contents,
			functionCalls,
			response,
			stepOptions,
			step,
			traceId,
			callCounts,
			failureCounts,
			dispatch,
		});

		if (aborted) {
			logger.info(`[Agent:${traceId}] Aborted after step ${step}.`);
			return responseText;
		}

		const stall = nextStallCount(stallCount, ranAny);
		stallCount = stall.count;
		if (stall.end) {
			logger.warn(
				`[Agent:${traceId}] Model stalled on duplicate tool calls; ending loop early.`,
			);
			AgentTraceLogger.add({
				traceId,
				kind: "loop-detected",
				step,
				detail: "stalled on duplicates; ending loop",
			});
			break;
		}
	}

	AgentTraceLogger.add({
		traceId,
		kind: "final",
		step: 0,
		detail: responseText ? "text produced" : "summarizing",
	});

	// If the loop terminated after tool execution without a final text response,
	// invoke the model one final time without tools to summarize and answer the user.
	return finalizeAfterToolExecution(
		contents,
		genConfig,
		responseText,
		executedTools,
		signal,
		traceId,
	);
}
