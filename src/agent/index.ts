import { toolRegistry } from "./registry";
import { webSearchTool } from "./tools/webSearch";

// Register default built-in tools
toolRegistry.register(webSearchTool);

export * from "./types";
export * from "./registry";
export * from "./tools/webSearch";
export { toolRegistry };
