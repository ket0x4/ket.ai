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

function generateTraceId(): string {
	return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Runs a final tool-less model turn to summarize the work when the loop ended
 * after tool execution without producing any user-facing text.
 */
async function generateFinalSummary(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
): Promise<string> {
	const finalGenConfig = {
		...genConfig,
		tools: undefined,
		maxOutputTokens: 2048,
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
				config: genConfig as any,
			}),
		);

		const functionCalls = extractFunctionCalls(response);
		if (functionCalls.length === 0) {
			responseText = response.text?.trim() || "";
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
	if (!responseText && executedTools && !signal?.aborted) {
		try {
			logger.info(
				`[Agent:${traceId}] Tool execution finished at step limit. Generating final summary reply...`,
			);
			responseText = await generateFinalSummary(contents, genConfig);
		} catch (err) {
			logger.warn(
				`[Agent:${traceId}] Error generating final summary after tool execution:`,
				err,
			);
		}
	}

	return responseText;
}
