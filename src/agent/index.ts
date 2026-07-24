import { toolRegistry } from "./registry";
import { webSearchTool } from "./tools/webSearch";
import { urlSummarizerTool } from "./tools/urlSummarizer";

// Register default built-in tools
toolRegistry.register(webSearchTool);
toolRegistry.register(urlSummarizerTool);

export * from "./types";
export * from "./registry";
export * from "./tools/webSearch";
export * from "./tools/urlSummarizer";
export { toolRegistry };
