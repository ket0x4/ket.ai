import { CONFIG } from "../config";
import { ai } from "../services/gemini/client";
import { runWithRetry } from "../services/gemini/utils";
import logger from "../utils/logger";
import {
	executeFunctionCallsInParallel,
	type ToolExecutionOptions,
} from "./executor";
import { extractFunctionCalls } from "./functionCalls";

export type AgentLoopOptions = ToolExecutionOptions;

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
	},
	traceId: string,
	step: number,
): NoToolCallOutcome {
	const text = response.text?.trim() || "";
	const finishReason = String(response.candidates?.[0]?.finishReason ?? "");
	const blockReason = response.promptFeedback?.blockReason
		? String(response.promptFeedback.blockReason)
		: undefined;
	const blocked =
		Boolean(blockReason) || BLOCKING_FINISH_REASONS.has(finishReason);

	if (!text) {
		logger.warn(
			`[Agent:${traceId}] Model returned no tool calls and no text at step ${step} (finishReason=${finishReason || "unknown"}, blockReason=${blockReason ?? "none"}).`,
		);
	} else if (finishReason === "MAX_TOKENS") {
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
 * Runs a final tool-less model turn to summarize the work when the loop ended
 * after tool execution without producing any user-facing text.
 */
async function generateFinalSummary(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<string> {
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

/**
 * Drives the multi-turn agent loop: invoking the model, executing requested
 * tools in parallel, feeding results back, and honoring cancellation.
 */
export async function runAgentLoop(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	options: AgentLoopOptions = {},
): Promise<string> {
	const { signal } = options;
	const traceId = options.traceId || generateTraceId();
	const stepOptions: AgentLoopOptions = { ...options, traceId };
	const maxSteps = CONFIG.MAX_AGENT_STEPS;

	let responseText = "";
	let executedTools = false;
	let retriedBlockedResponse = false;

	for (let step = 1; step <= maxSteps; step++) {
		if (signal?.aborted) {
			logger.info(`[Agent:${traceId}] Aborted before step ${step}.`);
			return responseText;
		}

		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
				contents: contents as any,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
				config: { ...genConfig, abortSignal: signal } as any,
			}),
		);

		const functionCalls = extractFunctionCalls(response);
		if (functionCalls.length === 0) {
			const outcome = inspectNoToolCallResponse(response, traceId, step);
			responseText = outcome.text;
			if (!responseText && outcome.blocked && !retriedBlockedResponse) {
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

		const modelContent = response.candidates?.[0]?.content;
		contents.push(
			modelContent
				? (modelContent as Record<string, unknown>)
				: {
						role: "model",
						parts: functionCalls.map((fc) => ({ functionCall: fc })),
					},
		);

		const toolParts = await executeFunctionCallsInParallel(
			functionCalls,
			stepOptions,
			step,
		);
		contents.push({ role: "user", parts: toolParts });

		if (signal?.aborted) {
			logger.info(`[Agent:${traceId}] Aborted after step ${step}.`);
			return responseText;
		}
	}

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
