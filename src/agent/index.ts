import {
	executeFunctionCallsInParallel,
	extractFunctionCalls,
	type MediaGeneratedCallback,
	runAgentLoop,
	type ToolCallCallback,
	type ToolProgressCallback,
} from "./executor";
import { toolRegistry } from "./registry";
import { sanitizeToolResultForLLM, smartTruncateText } from "./sanitizer";
import { webSearchTool } from "./tools/webSearch";
import type { GeneratedMediaArtifact } from "./types";

export type {
	GeneratedMediaArtifact,
	MediaGeneratedCallback,
	ToolCallCallback,
	ToolProgressCallback,
};
export {
	executeFunctionCallsInParallel,
	extractFunctionCalls,
	runAgentLoop,
	sanitizeToolResultForLLM,
	smartTruncateText,
	toolRegistry,
	webSearchTool,
};
