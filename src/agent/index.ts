import { CONFIG } from "../config";
import { AgentStateMachine } from "./fsm";
import { toolRegistry } from "./registry";
import { codeExecutionTool } from "./tools/codeExecution";
import { webSearchTool } from "./tools/webSearch";
import {
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	writeWorkspaceFileTool,
} from "./tools/workspaceTools";

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

export {
	AgentStateMachine,
	codeExecutionTool,
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	toolRegistry,
	webSearchTool,
	writeWorkspaceFileTool,
};
