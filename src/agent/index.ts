import { CONFIG, onBotSettingsUpdated } from "../config/index";
import {
	executeFunctionCallsInParallel,
	executeSingleToolCall,
	extractFunctionCalls,
	type MediaGeneratedCallback,
	runAgentLoop,
	type ToolCallCallback,
	type ToolProgressCallback,
} from "./executor";
import { AgentStateMachine } from "./fsm";
import { toolRegistry } from "./registry";
import { sanitizeToolResultForLLM, smartTruncateText } from "./sanitizer";
import { codeExecutionTool } from "./tools/codeExecution";
import { webSearchTool } from "./tools/webSearch";
import {
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	sendWorkspaceFileTool,
	writeWorkspaceFileTool,
} from "./tools/workspaceTools";
import type { AgentTool, GeneratedMediaArtifact } from "./types";
import { validateToolArguments } from "./validator";

const CODE_TOOLS: AgentTool[] = [
	codeExecutionTool,
	readWorkspaceFileTool,
	writeWorkspaceFileTool,
	sendWorkspaceFileTool,
	listWorkspaceFilesTool,
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
	AgentStateMachine,
	executeFunctionCallsInParallel,
	executeSingleToolCall,
	extractFunctionCalls,
	runAgentLoop,
	sanitizeToolResultForLLM,
	smartTruncateText,
	toolRegistry,
	validateToolArguments,
	webSearchTool,
};
