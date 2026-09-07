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

export function syncToolsWithConfig(): void {
	// Dynamically evaluated via toolRegistry getters based on CONFIG
}

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
