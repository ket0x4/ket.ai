import {
	type AgentEvent,
	type AgentEventHandler,
	mergeAgentEventHandlers,
} from "./events";
import type { ToolExecutionOptions } from "./executor";
import { executeFunctionCallsInParallel } from "./executor";
import { extractFunctionCalls } from "./functionCalls";
import { runAgentLoop } from "./loop";
import { toolRegistry } from "./registry";
import { sanitizeToolResultForLLM, smartTruncateText } from "./sanitizer";
import { webSearchTool } from "./tools/webSearch";
import type { GeneratedMediaArtifact } from "./types";

export type {
	AgentEvent,
	AgentEventHandler,
	GeneratedMediaArtifact,
	ToolExecutionOptions,
};
export {
	executeFunctionCallsInParallel,
	extractFunctionCalls,
	mergeAgentEventHandlers,
	runAgentLoop,
	sanitizeToolResultForLLM,
	smartTruncateText,
	toolRegistry,
	webSearchTool,
};
