import {
	type AgentEvent,
	type AgentEventHandler,
	mergeAgentEventHandlers,
} from "./events";
import { executeFunctionCallsInParallel } from "./executor";
import { extractFunctionCalls } from "./functionCalls";
import {
	buildStepGuidance,
	compactContents,
	fingerprintToolCall,
	runAgentLoop,
} from "./loop";
import { toolRegistry } from "./registry";
import {
	extractMediaArtifactsFromResult,
	sanitizeToolResultForLLM,
	smartTruncateText,
} from "./sanitizer";
import { fetchUrlTool } from "./tools/fetchUrl";
import { updatePlanTool } from "./tools/plan";
import { webSearchTool } from "./tools/webSearch";
import {
	editWorkspaceFile,
	editWorkspaceFileTool,
	searchWorkspaceTool,
	writeWorkspaceFile,
} from "./tools/workspaceTools";
import { AgentTraceLogger } from "./trace";
import type { GeneratedMediaArtifact } from "./types";

export type { AgentTraceEntry, AgentTraceKind } from "./trace";
export type { AgentEvent, AgentEventHandler, GeneratedMediaArtifact };
export {
	AgentTraceLogger,
	buildStepGuidance,
	compactContents,
	editWorkspaceFile,
	editWorkspaceFileTool,
	executeFunctionCallsInParallel,
	extractFunctionCalls,
	extractMediaArtifactsFromResult,
	fetchUrlTool,
	fingerprintToolCall,
	mergeAgentEventHandlers,
	runAgentLoop,
	sanitizeToolResultForLLM,
	searchWorkspaceTool,
	smartTruncateText,
	toolRegistry,
	updatePlanTool,
	webSearchTool,
	writeWorkspaceFile,
};
