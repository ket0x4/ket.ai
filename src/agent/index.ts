import { toolRegistry } from "./registry";
import { urlSummarizerTool } from "./tools/urlSummarizer";
import { webSearchTool } from "./tools/webSearch";

// Register default built-in tools
toolRegistry.register(webSearchTool);
toolRegistry.register(urlSummarizerTool);

export { toolRegistry };
