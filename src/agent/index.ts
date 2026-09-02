import { CONFIG } from "../config";
import { AgentStateMachine } from "./fsm";
import { toolRegistry } from "./registry";
import { codeExecutionTool } from "./tools/codeExecution";
import { webSearchTool } from "./tools/webSearch";

// Register default built-in tools
if (CONFIG.ENABLE_WEB_SEARCH) {
	toolRegistry.register(webSearchTool);
}

if (CONFIG.ENABLE_CODE_EXECUTION) {
	toolRegistry.register(codeExecutionTool);
}

export { AgentStateMachine, codeExecutionTool, toolRegistry, webSearchTool };
