import { CONFIG } from "../config";
import { openAiProvider } from "../services/llm/openAiProvider";
import type { ChatMessage } from "../services/llm/types";
import logger from "../utils/logger";
import type { AgentEvent, AgentEventHandler } from "./events";
import {
	executeFunctionCallsInParallel,
	type ToolExecutionOptions,
} from "./executor";
import { extractFunctionCalls, type RawFunctionCall } from "./functionCalls";
import type { FunctionDeclaration } from "./types";

type AgentLoopOptions = ToolExecutionOptions;

/** Provider-agnostic generation config for the whole loop. */
export interface AgentLoopConfig {
	systemInstruction?: string;
	maxOutputTokens?: number;
	tools?: FunctionDeclaration[];
}

const BLOCKING_FINISH_REASONS = new Set(["content_filter"]);

const COMPACT_TEXT_LIMIT = 1500;
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

function generateTraceId(): string {
	return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// --- Context compaction -----------------------------------------------------

function compactTextValue(text: string): string {
	if (text.length <= COMPACT_TEXT_LIMIT || text.endsWith(COMPACTED_MARKER)) {
		return text;
	}
	return `${text.slice(0, COMPACT_TEXT_LIMIT)}\n${COMPACTED_MARKER}`;
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

/** Compacts oversized tool-result payloads from older turns. */
function compactToolMessage(msg: ChatMessage): ChatMessage {
	const serialized = msg.content ?? "";
	if (
		serialized.length <= COMPACT_TOOL_RESULT_LIMIT ||
		serialized.includes(COMPACTED_MARKER)
	) {
		return msg;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(serialized);
	} catch {
		return {
			...msg,
			content: `${serialized.slice(0, COMPACT_TOOL_FIELD_LIMIT)}...${COMPACTED_MARKER}`,
		};
	}

	const compactedResult =
		parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? shrinkToolResultObject(parsed as Record<string, unknown>)
			: `${serialized.slice(0, COMPACT_TOOL_FIELD_LIMIT)}...${COMPACTED_MARKER}`;

	return { ...msg, content: JSON.stringify(compactedResult) };
}

function compactMessage(msg: ChatMessage, shrinkText: boolean): ChatMessage {
	if (msg.role === "tool") return compactToolMessage(msg);

	if (shrinkText && typeof msg.content === "string") {
		const nextContent = compactTextValue(msg.content);
		return nextContent === msg.content ? msg : { ...msg, content: nextContent };
	}
	return msg;
}

function estimateMessageChars(msg: ChatMessage): number {
	if (typeof msg.content === "string") return msg.content.length;
	// Avoid stringifying base64 media buffers.
	return msg.media ? 256 : 0;
}

function estimateMessagesChars(messages: ChatMessage[]): number {
	let total = 0;
	for (const msg of messages) {
		total += estimateMessageChars(msg);
		if (Array.isArray(msg.toolCalls)) {
			for (const fc of msg.toolCalls) {
				try {
					total += JSON.stringify(fc.args ?? {}).length;
				} catch {
					// ignore unserializable args
				}
			}
		}
	}
	return total;
}

/**
 * Proactively compacts tool results and long text older than the most recent
 * turns so multi-step loops do not re-send kilobytes of stale context on every
 * subsequent step.
 */
function compactMessages(
	messages: ChatMessage[],
	maxChars: number,
	keepRecentTurns: number = COMPACT_KEEP_RECENT_TURNS,
): ChatMessage[] {
	if (messages.length <= keepRecentTurns + 1) return messages;

	const shrinkText = estimateMessagesChars(messages) > maxChars;
	const cutoff = Math.max(1, messages.length - keepRecentTurns);
	const compacted = [...messages];
	for (let i = 1; i < cutoff; i++) {
		compacted[i] = compactMessage(compacted[i], shrinkText);
	}
	return compacted;
}

// --- Tool-call governance ---------------------------------------------------

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

function buildSuppressedToolMessage(
	fc: RawFunctionCall,
	note: string,
): ChatMessage {
	return {
		role: "tool",
		toolName: fc.name,
		toolCallId: fc.id,
		content: JSON.stringify({
			error: "duplicate_tool_call_suppressed",
			system_note: note,
		}),
	};
}

function buildToolMessage(fc: RawFunctionCall, result: unknown): ChatMessage {
	return {
		role: "tool",
		toolName: fc.name,
		toolCallId: fc.id,
		content: typeof result === "string" ? result : JSON.stringify(result ?? {}),
	};
}

interface PartitionedToolCalls {
	toRun: RawFunctionCall[];
	responses: Map<RawFunctionCall, ChatMessage>;
	suppressed: Array<{ toolName: string; reason: string }>;
}

function partitionToolCalls(
	functionCalls: RawFunctionCall[],
	callCounts: Map<string, number>,
): PartitionedToolCalls {
	const toRun: RawFunctionCall[] = [];
	const responses = new Map<RawFunctionCall, ChatMessage>();
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
				buildSuppressedToolMessage(
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

function resultIsFailure(result: unknown): boolean {
	if (!result || typeof result !== "object" || Array.isArray(result)) {
		return false;
	}
	const record = result as { error?: unknown; success?: unknown };
	return Boolean(record.error) || record.success === false;
}

function trackFailures(
	ranResults: unknown[],
	toRun: RawFunctionCall[],
	failureCounts: Map<string, number>,
): string[] {
	const notes: string[] = [];

	ranResults.forEach((result, index) => {
		const name = toRun[index]?.name || "unknown";
		if (!resultIsFailure(result)) {
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

// --- Model response inspection ---------------------------------------------

function inspectNoToolCallResponse(
	response: { text: string; choices?: unknown[] },
	traceId: string,
	step: number,
): { text: string; blocked: boolean } {
	const text = response.text;
	const firstChoice = response.choices?.[0] as
		| { finish_reason?: unknown }
		| undefined;
	const finishReason = String(firstChoice?.finish_reason ?? "");
	const blocked =
		BLOCKING_FINISH_REASONS.has(finishReason) ||
		finishReason === "content_filter";

	if (!text) {
		logger.warn(
			`[Agent:${traceId}] Model returned no tool calls and no text at step ${step} (finishReason=${finishReason || "unknown"}).`,
		);
	} else if (finishReason === "length") {
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

// --- Tool step --------------------------------------------------------------

interface ToolStepInput {
	messages: ChatMessage[];
	functionCalls: RawFunctionCall[];
	response: { text: string };
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
		messages,
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

	// Record the model turn: preamble text (if any) plus the requested calls.
	messages.push({
		role: "assistant",
		content: response.text || null,
		toolCalls: functionCalls,
	});

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

	const ranResults =
		toRun.length > 0
			? await executeFunctionCallsInParallel(toRun, stepOptions, step)
			: [];
	toRun.forEach((fc, index) => {
		responses.set(fc, buildToolMessage(fc, ranResults[index]));
	});

	const notices = trackFailures(ranResults, toRun, failureCounts);
	const remaining = maxSteps - step;
	if (remaining <= 2) {
		notices.push(
			remaining === 0
				? "Step budget reached."
				: `${remaining} step(s) left. Converge on your final answer now.`,
		);
	}

	for (const fc of functionCalls) {
		const toolMessage = responses.get(fc);
		if (toolMessage) messages.push(toolMessage);
	}
	if (notices.length > 0) {
		messages.push({
			role: "user",
			content: `[Agent Notice] ${notices.join(" ")}`,
		});
	}

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

// --- Finalization -----------------------------------------------------------

async function generateFinalSummary(
	messages: ChatMessage[],
	config: AgentLoopConfig,
	signal?: AbortSignal,
): Promise<string> {
	const result = await openAiProvider.chat(messages, {
		systemInstruction: config.systemInstruction,
		maxTokens: 1024,
		signal,
	});
	return result.text;
}

async function finalizeAfterToolExecution(
	messages: ChatMessage[],
	config: AgentLoopConfig,
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
		return await generateFinalSummary(messages, config, signal);
	} catch (err) {
		logger.warn(`[Agent:${traceId}] Error generating final summary:`, err);
		return responseText;
	}
}

function resolveNoToolTurn(
	response: { text: string; choices?: unknown[] },
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

/**
 * Runs the multi-step agent loop: model call → tool execution → repeat, until
 * the model produces a final text answer or the step budget is exhausted.
 * All provider specifics (wire format, retries, thinking config) live inside
 * the selected `LlmProvider`.
 */
export async function runAgentLoop(
	messages: ChatMessage[],
	config: AgentLoopConfig,
	options: AgentLoopOptions = {},
): Promise<string> {
	const { signal } = options;
	const { traceId, stepOptions } = resolveLoopOptions(options);
	const maxSteps = CONFIG.MAX_AGENT_STEPS;
	const dispatch = makeEventDispatcher(options.onEvent, traceId);
	const provider = openAiProvider;

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

		const compacted = compactMessages(messages, CONFIG.AGENT_CONTEXT_MAX_CHARS);
		const response = await provider.chat(compacted, {
			tools: config.tools,
			systemInstruction: config.systemInstruction,
			maxTokens: config.maxOutputTokens,
			signal,
		});

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
			messages,
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
		messages,
		config,
		responseText,
		executedTools,
		signal,
		traceId,
	);
}
