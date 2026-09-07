import { CONFIG, onBotSettingsUpdated } from "../config/index";
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
import type { AgentTool, GeneratedMediaArtifact } from "./types";

const CODE_TOOLS: AgentTool[] = [
	codeExecutionTool,
	bashExecutionTool,
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	writeWorkspaceFileTool,
	sendWorkspaceFileTool,
	resetWorkspaceTool,
];

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

// Initial synchronization on module load
syncToolsWithConfig();

// Keep tool registry synchronized if settings change dynamically at runtime
onBotSettingsUpdated(() => {
	syncToolsWithConfig();
});

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
