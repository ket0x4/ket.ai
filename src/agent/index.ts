import { CONFIG, onBotSettingsUpdated } from "../config";
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
	sendWorkspaceFileTool,
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

const CODE_TOOLS: AgentTool[] = [
	codeExecutionTool,
	readWorkspaceFileTool,
	writeWorkspaceFileTool,
	sendWorkspaceFileTool,
	listWorkspaceFilesTool,
	resetWorkspaceTool,
];

/**
 * Synchronizes the global toolRegistry with the current CONFIG settings.
 */
export function syncToolsWithConfig(): void {
	if (CONFIG.ENABLE_WEB_SEARCH) {
		if (!toolRegistry.hasTool(webSearchTool.name)) {
			toolRegistry.register(webSearchTool);
		}
	} else {
		toolRegistry.unregister(webSearchTool.name);
	}

	if (CONFIG.ENABLE_CODE_EXECUTION) {
		for (const tool of CODE_TOOLS) {
			if (!toolRegistry.hasTool(tool.name)) {
				toolRegistry.register(tool);
			}
		}
	} else {
		for (const tool of CODE_TOOLS) {
			toolRegistry.unregister(tool.name);
		}
	}
}

// Register default built-in tools based on initial config
syncToolsWithConfig();

// Keep tool registry synchronized if settings change dynamically at runtime
onBotSettingsUpdated(() => {
	syncToolsWithConfig();
});

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
	sendWorkspaceFileTool,
	smartTruncateText,
	ToolRegistry,
	toolRegistry,
	validateToolArguments,
	webSearchTool,
	writeWorkspaceFileTool,
};
