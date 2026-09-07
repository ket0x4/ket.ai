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
import { bashExecutionTool, codeExecutionTool } from "./tools/codeExecution";
import { webSearchTool } from "./tools/webSearch";
import {
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	sendWorkspaceFileTool,
	writeWorkspaceFileTool,
} from "./tools/workspaceTools";
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
	bashExecutionTool,
	codeExecutionTool,
	executeFunctionCallsInParallel,
	extractFunctionCalls,
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	runAgentLoop,
	sanitizeToolResultForLLM,
	sendWorkspaceFileTool,
	smartTruncateText,
	toolRegistry,
	webSearchTool,
	writeWorkspaceFileTool,
};
