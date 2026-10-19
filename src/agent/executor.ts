import logger from "../utils/logger";
import { ToolTraceLogger } from "../utils/toolTrace";
import { type AgentEventHandler, mergeAgentEventHandlers } from "./events";
import type { RawFunctionCall } from "./functionCalls";
import { toolRegistry } from "./registry";
import { sanitizeToolResultForLLM } from "./sanitizer";
import type { ToolExecutionContext } from "./types";

export interface ToolExecutionOptions {
	chatId?: string;
	sessionId?: string;
	traceId?: string;
	signal?: AbortSignal;
	onEvent?: AgentEventHandler;
	sentFiles?: Set<string>;
}

function buildFunctionResponse(
	fc: RawFunctionCall,
	result: unknown,
): Record<string, unknown> {
	const functionResponseObj: Record<string, unknown> = {
		name: fc.name,
		response: { result },
	};
	if (fc.id) {
		functionResponseObj.id = fc.id;
	}
	return { functionResponse: functionResponseObj };
}

/**
 * Executes a single function call: runs the tool, logs a trace, delivers any
 * generated media artifacts, and returns an LLM-safe functionResponse part.
 */
async function executeSingleToolCall(
	fc: RawFunctionCall,
	context: ToolExecutionContext,
): Promise<Record<string, unknown>> {
	const name = fc.name;
	const args: Record<string, unknown> = { ...(fc.args || {}) };
	const traceId = context.traceId || "default";
	const step = context.step || 1;
	const chatIdStr = context.chatId || "default";

	if (context.signal?.aborted) {
		logger.info(`[Agent:${traceId}] Tool '${name}' skipped (aborted).`);
		return buildFunctionResponse(fc, {
			error: `Tool '${name}' was cancelled before execution.`,
		});
	}

	const startTime = Date.now();
	const rawResult = await toolRegistry.executeTool(name, args, context);
	const durationMs = Date.now() - startTime;

	// Sanitize output first (strips heavy base64, truncates oversized stdout)
	// so trace snippet serialization never stringifies multi-megabyte buffers.
	const llmSafeResult = sanitizeToolResultForLLM(rawResult);
	const snippet =
		typeof llmSafeResult === "string"
			? llmSafeResult.slice(0, 300)
			: JSON.stringify(llmSafeResult ?? {}).slice(0, 300);

	ToolTraceLogger.add({
		chatId: chatIdStr,
		traceId,
		toolName: name,
		args,
		resultSnippet: snippet,
		executionTimeMs: durationMs,
		step,
	});

	return buildFunctionResponse(fc, llmSafeResult);
}

/**
 * Executes multiple function calls in parallel while preserving exact response
 * ordering, isolating failures, and routing all reporting through one emitter.
 */
export async function executeFunctionCallsInParallel(
	functionCalls: RawFunctionCall[],
	options: ToolExecutionOptions,
	step: number,
): Promise<Array<Record<string, unknown>>> {
	const emit = mergeAgentEventHandlers(options.onEvent);

	// Announce every requested tool first, in order, before execution begins.
	for (const fc of functionCalls) {
		await emit({
			type: "tool-call",
			toolName: fc.name,
			args: fc.args || {},
			step,
		});
	}

	const baseContext: ToolExecutionContext = {
		chatId: options.chatId,
		sessionId: options.sessionId || options.chatId || "default",
		step,
		traceId: options.traceId,
		signal: options.signal,
		sentFiles: options.sentFiles,
	};

	const toolPromises = functionCalls.map((fc) => {
		const toolContext: ToolExecutionContext = {
			...baseContext,
			onProgress: (progress) => {
				void emit({ type: "tool-progress", toolName: fc.name, progress, step });
			},
			emitArtifact: (artifact) => {
				void emit({ type: "media-generated", media: [artifact] });
			},
		};
		return executeSingleToolCall(fc, toolContext);
	});

	return Promise.all(toolPromises);
}
