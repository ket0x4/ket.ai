import { toolRegistry } from "./registry";
import { urlSummarizerTool } from "./tools/urlSummarizer";
import { webSearchTool } from "./tools/webSearch";

// Register default built-in tools
toolRegistry.register(webSearchTool);
toolRegistry.register(urlSummarizerTool);

export * from "./registry";
export * from "./tools/urlSummarizer";
export * from "./tools/webSearch";
export * from "./types";
export { toolRegistry };
