import { CONFIG } from "../config";
import { ai } from "../services/gemini/client";
import { getThinkingConfig, runWithRetry } from "../services/gemini/utils";
import { openAiProvider } from "../services/llm/openAiProvider";
import type { ChatMessage } from "../services/llm/types";
import logger from "../utils/logger";
import type { AgentEvent, AgentEventHandler } from "./events";
import {
	executeFunctionCallsInParallel,
	type ToolExecutionOptions,
} from "./executor";
import {
	extractFunctionCalls,
	type ModelResponseLike,
	type RawFunctionCall,
} from "./functionCalls";
import { toolRegistry } from "./registry";

type AgentLoopOptions = ToolExecutionOptions;

const BLOCKING_FINISH_REASONS = new Set([
	"SAFETY",
	"RECITATION",
	"BLOCKLIST",
	"PROHIBITED_CONTENT",
	"SPII",
	"IMAGE_SAFETY",
]);

const COMPACT_TEXT_PART_LIMIT = 1500;
const COMPACT_TOOL_RESULT_LIMIT = 800;
const COMPACT_TOOL_FIELD_LIMIT = 400;
const COMPACT_KEEP_RECENT_TURNS = 4;
const COMPACTED_MARKER = "[...compacted...]";

const TRUNCATED_RESULT_FIELDS = [
	"stdout",
	"stderr",
	"content",
	"text",
	"summary",
] as const;

function convertToolParts(
	toolParts: Array<Record<string, unknown>>,
	text: string,
): ChatMessage[] {
	const out: ChatMessage[] = toolParts.map((tp) => {
		const result = (tp.response as { result?: unknown })?.result ?? tp.response;
		return {
			role: "tool",
			toolName: typeof tp.name === "string" ? tp.name : undefined,
			toolCallId: typeof tp.id === "string" ? tp.id : undefined,
			content:
				typeof result === "string" ? result : JSON.stringify(result ?? {}),
		};
	});
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

	if (role === "user") return convertUserParts(parts);
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

function generateTraceId(): string {
	return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ModelStepResponse extends ModelResponseLike {
	text?: string;
	promptFeedback?: { blockReason?: unknown };
}

function extractResponseText(response: ModelStepResponse): string {
	if (response.text?.trim()) return response.text.trim();
	const firstChoice = response.choices?.[0] as
		| { message?: { content?: unknown } }
		| undefined;
	return typeof firstChoice?.message?.content === "string"
		? firstChoice.message.content.trim()
		: "";
}

function inspectNoToolCallResponse(
	response: ModelStepResponse,
	traceId: string,
	step: number,
): { text: string; blocked: boolean } {
	const text = extractResponseText(response);
	const firstCandidate = response.candidates?.[0] as
		| { finishReason?: unknown }
		| undefined;
	const firstChoice = response.choices?.[0] as
		| { finish_reason?: unknown }
		| undefined;
	const finishReason = String(
		firstCandidate?.finishReason ?? firstChoice?.finish_reason ?? "",
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
			`[Agent:${traceId}] Response flagged by provider (finishReason=${finishReason || "unknown"}); using available text.`,
		);
	}

	return { text, blocked };
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

function fingerprintToolCall(fc: RawFunctionCall): string {
	const args = fc.args ?? {};
	try {
		return `${fc.name}::${JSON.stringify(sortedKeys(args))}`;
	} catch {
		return `${fc.name}::${JSON.stringify(args)}`;
	}
}

function shrinkToolResultObject(
	result: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(result)) {
		if (k === "system_note" || k === "results" || k === "matches") continue;
		if (
			typeof v === "string" &&
			(TRUNCATED_RESULT_FIELDS as readonly string[]).includes(k) &&
			v.length > COMPACT_TOOL_FIELD_LIMIT
		) {
			out[k] = `${v.slice(0, COMPACT_TOOL_FIELD_LIMIT)}...${COMPACTED_MARKER}`;
		} else {
			out[k] = v;
		}
	}
	return out;
}

function compactFunctionResponsePart(
	part: Record<string, unknown>,
): Record<string, unknown> {
	const functionResponse = part.functionResponse as
		| { response?: { result?: unknown }; _compacted?: boolean }
		| undefined;
	if (!functionResponse || functionResponse._compacted) return part;

	let serialized = "";
	try {
		serialized = JSON.stringify(functionResponse.response ?? {});
	} catch {
		return part;
	}
	if (serialized.length <= COMPACT_TOOL_RESULT_LIMIT) return part;

	const rawResult = functionResponse.response?.result;
	const compactedResult =
		rawResult && typeof rawResult === "object" && !Array.isArray(rawResult)
			? shrinkToolResultObject(rawResult as Record<string, unknown>)
			: `${serialized.slice(0, COMPACT_TOOL_FIELD_LIMIT)}...${COMPACTED_MARKER}`;

	return {
		...part,
		functionResponse: {
			...functionResponse,
			_compacted: true,
			response: { result: compactedResult },
		},
	};
}

function compactTextValue(text: string): string {
	if (
		text.length <= COMPACT_TEXT_PART_LIMIT ||
		text.endsWith(COMPACTED_MARKER)
	) {
		return text;
	}
	return `${text.slice(0, COMPACT_TEXT_PART_LIMIT)}\n${COMPACTED_MARKER}`;
}

function compactEntry(
	entry: Record<string, unknown>,
	shrinkText: boolean,
): Record<string, unknown> {
	if (shrinkText && typeof entry.content === "string") {
		const nextContent = compactTextValue(entry.content);
		return nextContent === entry.content
			? entry
			: { ...entry, content: nextContent };
	}

	const parts = Array.isArray(entry.parts)
		? (entry.parts as Array<Record<string, unknown>>)
		: null;
	if (!parts) return entry;

	const compactedParts = parts.map((part) => {
		if (!part || typeof part !== "object") return part;
		if (shrinkText && typeof part.text === "string") {
			const nextText = compactTextValue(part.text);
			return nextText === part.text ? part : { ...part, text: nextText };
		}
		return compactFunctionResponsePart(part);
	});

	return { ...entry, parts: compactedParts };
}

function estimatePartChars(part: Record<string, unknown>): number {
	if (typeof part.text === "string") return part.text.length;
	if (part.inlineData) return 256; // Avoid stringifying base64 media buffers
	try {
		return JSON.stringify(part).length;
	} catch {
		return 0;
	}
}

function estimateContentsChars(
	contents: Array<Record<string, unknown>>,
): number {
	let total = 0;
	for (const entry of contents) {
		if (typeof entry.content === "string") {
			total += entry.content.length;
		}
		if (Array.isArray(entry.parts)) {
			for (const part of entry.parts) {
				if (part && typeof part === "object") {
					total += estimatePartChars(part as Record<string, unknown>);
				}
			}
		}
	}
	return total;
}

/**
 * Proactively compacts tool results older than the most recent turns so multi-step
 * loops do not re-send multi-kilobyte tool outputs on every subsequent step.
 */
function compactContents(
	contents: Array<Record<string, unknown>>,
	maxChars: number,
	keepRecentTurns: number = COMPACT_KEEP_RECENT_TURNS,
): Array<Record<string, unknown>> {
	if (contents.length <= keepRecentTurns + 1) return contents;

	const shrinkText = estimateContentsChars(contents) > maxChars;
	const cutoff = Math.max(1, contents.length - keepRecentTurns);
	for (let i = 1; i < cutoff; i++) {
		contents[i] = compactEntry(contents[i], shrinkText);
	}
	return contents;
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
	return (part.functionResponse as { name?: string } | undefined)?.name;
}

async function generateFinalSummary(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<string> {
	if (CONFIG.LLM_PROVIDER === "openai") {
		const messages = convertContentsToChatMessages(contents);
		const result = await openAiProvider.chat(messages, {
			systemInstruction: genConfig.systemInstruction as string | undefined,
			maxTokens: 1024,
			signal,
		});
		return result.text;
	}

	const finalResponse = await runWithRetry(() =>
		ai.models.generateContent({
			model: CONFIG.GEMINI_MODEL,
			// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
			contents: contents as any,
			config: {
				...genConfig,
				tools: undefined,
				maxOutputTokens: 1024,
				thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL, {
					isAgentic: false,
				}),
				abortSignal: signal,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
			} as any,
		}),
	);
	return finalResponse.text?.trim() || "";
}

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
			`[Agent:${traceId}] Generating final summary after tool execution...`,
		);
		return await generateFinalSummary(contents, genConfig, signal);
	} catch (err) {
		logger.warn(`[Agent:${traceId}] Error generating final summary:`, err);
		return responseText;
	}
}

interface PartitionedToolCalls {
	toRun: RawFunctionCall[];
	responses: Map<RawFunctionCall, Record<string, unknown>>;
	suppressed: Array<{ toolName: string; reason: string }>;
}

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
					"Identical tool call already executed. Use the previous result or answer now.",
				),
			);
		} else {
			toRun.push(fc);
		}
	}

	return { toRun, responses, suppressed };
}

function trackFailures(
	ranParts: Array<Record<string, unknown>>,
	toRun: RawFunctionCall[],
	failureCounts: Map<string, number>,
): string[] {
	const notes: string[] = [];

	ranParts.forEach((part, index) => {
		const name = toolNameOf(part) || toRun[index]?.name || "unknown";
		if (!resultIsFailure(part)) {
			failureCounts.set(name, 0);
			return;
		}
		const failures = (failureCounts.get(name) || 0) + 1;
		failureCounts.set(name, failures);
		if (failures >= CONFIG.MAX_TOOL_FAILURES_PER_TOOL) {
			notes.push(
				`Tool '${name}' failed ${failures}x in a row. Change approach or answer with available info.`,
			);
		}
	});

	return notes;
}

interface ToolStepInput {
	contents: Array<Record<string, unknown>>;
	functionCalls: RawFunctionCall[];
	response: ModelStepResponse;
	stepOptions: AgentLoopOptions;
	step: number;
	maxSteps: number;
	traceId: string;
	callCounts: Map<string, number>;
	failureCounts: Map<string, number>;
	dispatch: (event: AgentEvent) => Promise<void>;
}

async function processToolStep(
	input: ToolStepInput,
): Promise<{ aborted: boolean; ranAny: boolean }> {
	const {
		contents,
		functionCalls,
		response,
		stepOptions,
		step,
		maxSteps,
		traceId,
		callCounts,
		failureCounts,
		dispatch,
	} = input;

	const firstCandidate = response.candidates?.[0] as
		| { content?: Record<string, unknown> }
		| undefined;
	const fallbackParts: Array<Record<string, unknown>> = [];
	const preambleText = extractResponseText(response);
	if (preambleText) {
		fallbackParts.push({ text: preambleText });
	}
	for (const fc of functionCalls) {
		fallbackParts.push({ functionCall: fc });
	}
	contents.push(
		firstCandidate?.content ?? {
			role: "model",
			parts: fallbackParts,
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
	}

	const ranParts =
		toRun.length > 0
			? await executeFunctionCallsInParallel(toRun, stepOptions, step)
			: [];
	toRun.forEach((fc, index) => {
		responses.set(fc, ranParts[index]);
	});

	const notices = trackFailures(ranParts, toRun, failureCounts);
	const remaining = maxSteps - step;
	if (remaining <= 2) {
		notices.push(
			remaining === 0
				? "Step budget reached."
				: `${remaining} step(s) left. Converge on your final answer now.`,
		);
	}

	const orderedParts = functionCalls
		.map((fc) => responses.get(fc))
		.filter((part): part is Record<string, unknown> => Boolean(part));
	if (notices.length > 0) {
		orderedParts.push({ text: `[Agent Notice] ${notices.join(" ")}` });
	}
	contents.push({ role: "user", parts: orderedParts });

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

function normalizeGeminiTools(rawTools: unknown): unknown {
	if (!Array.isArray(rawTools) || rawTools.length === 0) return undefined;
	const first = rawTools[0] as Record<string, unknown> | undefined;
	if (first && ("functionDeclarations" in first || "googleSearch" in first)) {
		return rawTools;
	}
	return [{ functionDeclarations: rawTools }];
}

function resolveOpenAiTools(rawTools: unknown) {
	if (Array.isArray(rawTools) && rawTools.length > 0) {
		const first = rawTools[0] as Record<string, unknown> | undefined;
		if (first && Array.isArray(first.functionDeclarations)) {
			return first.functionDeclarations;
		}
		return rawTools;
	}
	const declarations = toolRegistry.getFunctionDeclarations();
	return declarations.length > 0 ? declarations : undefined;
}

async function callModelForStep(
	compactedContents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	step: number,
	signal?: AbortSignal,
): Promise<ModelStepResponse> {
	if (CONFIG.LLM_PROVIDER === "openai") {
		const chatMessages = convertContentsToChatMessages(compactedContents);
		const tools = resolveOpenAiTools(genConfig.tools);
		const isJson = !tools && genConfig.responseMimeType === "application/json";
		return await openAiProvider.chat(chatMessages, {
			systemInstruction: genConfig.systemInstruction as string | undefined,
			tools,
			maxTokens:
				typeof genConfig.maxOutputTokens === "number"
					? genConfig.maxOutputTokens
					: 2048,
			responseFormat: isJson ? "json" : "text",
			signal,
		});
	}

	const tools = normalizeGeminiTools(genConfig.tools);
	const thinkingConfig =
		genConfig.thinkingConfig ??
		getThinkingConfig(CONFIG.GEMINI_MODEL, {
			isAgentic: step > 1,
		});

	return (await runWithRetry(() =>
		ai.models.generateContent({
			model: CONFIG.GEMINI_MODEL,
			// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
			contents: compactedContents as any,
			config: {
				...genConfig,
				tools,
				thinkingConfig,
				abortSignal: signal,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
			} as any,
		}),
	)) as ModelStepResponse;
}

function resolveNoToolTurn(
	response: ModelStepResponse,
	traceId: string,
	step: number,
	alreadyRetried: boolean,
): { retry: boolean; text: string } {
	const outcome = inspectNoToolCallResponse(response, traceId, step);
	return {
		retry: !outcome.text && outcome.blocked && !alreadyRetried,
		text: outcome.text,
	};
}

function resolveLoopOptions(options: AgentLoopOptions): {
	traceId: string;
	stepOptions: AgentLoopOptions;
} {
	const traceId = options.traceId || generateTraceId();
	const sentFiles = options.sentFiles || new Set<string>();
	return { traceId, stepOptions: { ...options, traceId, sentFiles } };
}

export async function runAgentLoop(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	options: AgentLoopOptions = {},
): Promise<string> {
	const { signal } = options;
	const { traceId, stepOptions } = resolveLoopOptions(options);
	const maxSteps = CONFIG.MAX_AGENT_STEPS;
	const dispatch = makeEventDispatcher(options.onEvent, traceId);

	let responseText = "";
	let executedTools = false;
	let retriedBlockedResponse = false;
	let stallCount = 0;

	const callCounts = new Map<string, number>();
	const failureCounts = new Map<string, number>();

	for (let step = 1; step <= maxSteps; step++) {
		if (signal?.aborted) {
			logger.info(`[Agent:${traceId}] Aborted before step ${step}.`);
			return responseText;
		}

		await dispatch({ type: "step-start", step, maxSteps });

		const compactedContents = compactContents(
			contents,
			CONFIG.AGENT_CONTEXT_MAX_CHARS,
		);
		const response = await callModelForStep(
			compactedContents,
			genConfig,
			step,
			signal,
		);

		const functionCalls = extractFunctionCalls(response);
		if (functionCalls.length === 0) {
			const turn = resolveNoToolTurn(
				response,
				traceId,
				step,
				retriedBlockedResponse,
			);
			responseText = turn.text;
			if (turn.retry) {
				retriedBlockedResponse = true;
				continue;
			}
			executedTools = false;
			break;
		}

		executedTools = true;
		logger.info(
			`[Agent:${traceId}] Model requested ${functionCalls.length} tool call(s) at step ${step}`,
		);

		const { aborted, ranAny } = await processToolStep({
			contents,
			functionCalls,
			response,
			stepOptions,
			step,
			maxSteps,
			traceId,
			callCounts,
			failureCounts,
			dispatch,
		});

		if (aborted) return responseText;

		stallCount = ranAny ? 0 : stallCount + 1;
		if (stallCount >= 2) {
			logger.warn(
				`[Agent:${traceId}] Stalled on duplicate tool calls; ending loop early.`,
			);
			break;
		}
	}

	return finalizeAfterToolExecution(
		contents,
		genConfig,
		responseText,
		executedTools,
		signal,
		traceId,
	);
}
