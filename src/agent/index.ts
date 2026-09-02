import { CONFIG } from "../config";
import {
	type AgentExecutorOptions,
	executeFunctionCallsInParallel,
	executeSingleToolCall,
	extractFunctionCalls,
	type MediaGeneratedCallback,
	type RawFunctionCall,
	runAgentLoop,
	type ToolCallCallback,
	type ToolProgressCallback,
} from "./executor";
import { AgentStateMachine } from "./fsm";
import { ToolRegistry, toolRegistry } from "./registry";
import {
	extractMediaArtifactsFromResult,
	inferArtifactType,
	parseGeneratedArtifact,
	sanitizeToolResultForLLM,
	smartTruncateText,
} from "./sanitizer";
import { codeExecutionTool } from "./tools/codeExecution";
import { webSearchTool } from "./tools/webSearch";
import {
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	writeWorkspaceFileTool,
} from "./tools/workspaceTools";
import type {
	AgentTool,
	ArtifactMediaType,
	FunctionDeclaration,
	GeneratedMediaArtifact,
	JSONSchemaType,
	ToolExecutionContext,
	ToolParameterSchema,
	ToolProgressUpdate,
} from "./types";
import { type ValidationResult, validateToolArguments } from "./validator";

// Register default built-in tools
if (CONFIG.ENABLE_WEB_SEARCH) {
	toolRegistry.register(webSearchTool);
}

if (CONFIG.ENABLE_CODE_EXECUTION) {
	toolRegistry.register(codeExecutionTool);
	toolRegistry.register(readWorkspaceFileTool);
	toolRegistry.register(writeWorkspaceFileTool);
	toolRegistry.register(listWorkspaceFilesTool);
	toolRegistry.register(resetWorkspaceTool);
}

export type {
	AgentExecutorOptions,
	AgentTool,
	ArtifactMediaType,
	FunctionDeclaration,
	GeneratedMediaArtifact,
	JSONSchemaType,
	MediaGeneratedCallback,
	RawFunctionCall,
	ToolCallCallback,
	ToolExecutionContext,
	ToolParameterSchema,
	ToolProgressCallback,
	ToolProgressUpdate,
	ValidationResult,
};
export {
	AgentStateMachine,
	codeExecutionTool,
	executeFunctionCallsInParallel,
	executeSingleToolCall,
	extractFunctionCalls,
	extractMediaArtifactsFromResult,
	inferArtifactType,
	listWorkspaceFilesTool,
	parseGeneratedArtifact,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	runAgentLoop,
	sanitizeToolResultForLLM,
	smartTruncateText,
	ToolRegistry,
	toolRegistry,
	validateToolArguments,
	webSearchTool,
	writeWorkspaceFileTool,
};
