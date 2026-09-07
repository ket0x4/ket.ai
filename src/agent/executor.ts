import { CONFIG } from "../config";
import { ai } from "../services/gemini/client";
import { runWithRetry } from "../services/gemini/utils";
import logger from "../utils/logger";
import { ToolTraceLogger } from "../utils/toolTrace";
import { toolRegistry } from "./registry";
import {
	extractMediaArtifactsFromResult,
	sanitizeToolResultForLLM,
} from "./sanitizer";
import type {
	GeneratedMediaArtifact,
	ToolExecutionContext,
	ToolProgressUpdate,
} from "./types";

export type ToolCallCallback = (
	toolName: string,
	args: Record<string, unknown>,
	step: number,
) => Promise<void> | void;

export type ToolProgressCallback = (
	toolName: string,
	progress: ToolProgressUpdate,
	step: number,
) => Promise<void> | void;

export type MediaGeneratedCallback = (
	media: GeneratedMediaArtifact[],
) => Promise<void> | void;

interface RawFunctionCall {
	id?: string;
	name: string;
	args?: Record<string, unknown>;
}

interface AgentExecutorOptions {
	chatId?: string;
	sessionId?: string;
	traceId?: string;
	onToolCall?: ToolCallCallback;
	onToolProgress?: ToolProgressCallback;
	onMediaGenerated?: MediaGeneratedCallback;
}

/**
 * Extracts function calls from Gemini model response.
 */
export function extractFunctionCalls(response: {
	functionCalls?: Array<{
		id?: string;
		name?: string;
		args?: Record<string, unknown>;
	}>;
	candidates?: Array<{
		content?: {
			parts?: Array<{
				functionCall?: {
					id?: string;
					name?: string;
					args?: Record<string, unknown>;
				};
			}>;
		};
	}>;
}): RawFunctionCall[] {
	const rawParts = response.candidates?.[0]?.content?.parts;
	const candidateCalls =
		response.functionCalls ||
		rawParts?.filter((p) => p.functionCall?.name).map((p) => p.functionCall);
	return (candidateCalls || []).filter((fc): fc is RawFunctionCall =>
		Boolean(fc?.name),
	);
}

/**
 * Executes a single function call, logs trace, sanitizes result, and handles artifacts.
 */
export async function executeSingleToolCall(
	fc: RawFunctionCall,
	context: ToolExecutionContext,
	onMediaGenerated?: MediaGeneratedCallback,
): Promise<Record<string, unknown>> {
	const name = fc.name;
	const args: Record<string, unknown> = { ...(fc.args || {}) };
	const traceId = context.traceId || "default";
	const step = context.step || 1;
	const chatIdStr = context.chatId || "default";

	logger.info(`[Agent:${traceId}] Executing tool '${name}' at step ${step}...`);
	const startTime = Date.now();

	let result: unknown;
	try {
		result = await toolRegistry.executeTool(name, args, context);
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		logger.error(`[Agent:${traceId}] Unhandled tool '${name}' error:`, err);
		result = { error: errorMsg };
	}

	const durationMs = Date.now() - startTime;

	// Extract and deliver full binary/base64 media artifacts (photos, excel, video, etc.)
	const artifacts = extractMediaArtifactsFromResult(result);
	if (artifacts.length > 0 && onMediaGenerated) {
		try {
			await onMediaGenerated(artifacts);
		} catch (err) {
			logger.warn(
				`[Agent:${traceId}] Error in onMediaGenerated callback:`,
				err,
			);
		}
	}

	// Tool trace logging
	const snippet =
		typeof result === "string"
			? result.substring(0, 300)
			: JSON.stringify(result).substring(0, 300);
	ToolTraceLogger.add({
		chatId: chatIdStr,
		traceId,
		toolName: name,
		args,
		resultSnippet: snippet,
		executionTimeMs: durationMs,
		step,
	});

	// Sanitize output for LLM (strips heavy base64, truncates oversized stdout)
	const llmSafeResult = sanitizeToolResultForLLM(result);

	const functionResponseObj: Record<string, unknown> = {
		name,
		response: { result: llmSafeResult },
	};
	if (fc.id) {
		functionResponseObj.id = fc.id;
	}

	return {
		functionResponse: functionResponseObj,
	};
}

/**
 * Executes multiple function calls in parallel while preserving exact response ordering and isolating failures.
 */
export async function executeFunctionCallsInParallel(
	functionCalls: RawFunctionCall[],
	options: AgentExecutorOptions,
	step: number,
): Promise<Array<Record<string, unknown>>> {
	// Notify onToolCall callbacks first
	if (options.onToolCall) {
		for (const fc of functionCalls) {
			try {
				await options.onToolCall(fc.name, fc.args || {}, step);
			} catch (err) {
				logger.warn("[Agent] Error executing onToolCall callback:", err);
			}
		}
	}

	const baseContext: ToolExecutionContext = {
		chatId: options.chatId,
		sessionId: options.sessionId || options.chatId || "default",
		step,
		traceId: options.traceId,
	};

	// Execute all tools concurrently with isolated contexts
	const toolPromises = functionCalls.map(async (fc) => {
		const toolContext: ToolExecutionContext = {
			...baseContext,
			onProgress: (progress: ToolProgressUpdate) => {
				if (options.onToolProgress) {
					try {
						options.onToolProgress(fc.name, progress, step);
					} catch (err) {
						logger.debug(
							`[Agent:${options.traceId}] Error in onToolProgress for ${fc.name}:`,
							err,
						);
					}
				}
			},
			emitArtifact: (artifact: GeneratedMediaArtifact) => {
				if (options.onMediaGenerated) {
					try {
						options.onMediaGenerated([artifact]);
					} catch (err) {
						logger.warn(
							`[Agent:${options.traceId}] Error in emitArtifact for ${fc.name}:`,
							err,
						);
					}
				}
			},
		};

		return executeSingleToolCall(fc, toolContext, options.onMediaGenerated);
	});

	return Promise.all(toolPromises);
}

/**
 * Drives the multi-turn agent step loop: invoking model, parallel tool execution, FSM driving, and final answer.
 */
export async function runAgentLoop(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	options: AgentExecutorOptions = {},
): Promise<string> {
	let responseText = "";
	const maxSteps = CONFIG.MAX_AGENT_STEPS;
	const traceId =
		options.traceId ||
		`trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
	let executedTools = false;

	for (let step = 1; step <= maxSteps; step++) {
		const response = await runWithRetry(
			() =>
				ai.models.generateContent({
					model: CONFIG.GEMINI_MODEL,
					// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
					contents: contents as any,
					// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
					config: genConfig as any,
				}),
			{ priority: "high" },
		);

		const functionCalls = extractFunctionCalls(response);

		if (functionCalls.length > 0) {
			executedTools = true;
			logger.info(
				`[Agent:${traceId}] Gemini requested ${functionCalls.length} tool call(s) at step ${step}`,
			);

			const modelContent = response.candidates?.[0]?.content;
			if (modelContent) {
				contents.push(modelContent as Record<string, unknown>);
			} else {
				contents.push({
					role: "model",
					parts: functionCalls.map((fc) => ({ functionCall: fc })),
				});
			}

			const toolParts = await executeFunctionCallsInParallel(
				functionCalls,
				{
					...options,
					traceId,
				},
				step,
			);
			contents.push({ role: "user", parts: toolParts });
			continue;
		}

		responseText = response.text?.trim() || "";
		executedTools = false;
		break;
	}

	// If loop terminated after tool execution without a final text response,
	// invoke the model one final time without tools to summarize and answer the user
	if (!responseText && executedTools) {
		try {
			logger.info(
				`[Agent:${traceId}] Tool execution finished at step limit. Generating final summary reply...`,
			);
			const finalGenConfig = {
				...genConfig,
				tools: undefined,
			};
			const finalResponse = await runWithRetry(
				() =>
					ai.models.generateContent({
						model: CONFIG.GEMINI_MODEL,
						// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
						contents: contents as any,
						// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
						config: finalGenConfig as any,
					}),
				{ priority: "high" },
			);
			responseText = finalResponse.text?.trim() || "";
		} catch (err) {
			logger.warn(
				`[Agent:${traceId}] Error generating final summary after tool execution:`,
				err,
			);
		}
	}

	return responseText;
}
