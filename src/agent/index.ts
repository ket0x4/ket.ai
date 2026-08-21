import { AgentStateMachine } from "./fsm";
import { toolRegistry } from "./registry";
import { webSearchTool } from "./tools/webSearch";

// Register default built-in tools
toolRegistry.register(webSearchTool);

export { AgentStateMachine, toolRegistry };
