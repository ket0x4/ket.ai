import logger from "../utils/logger";
import { bashExecutionTool, codeExecutionTool } from "./tools/codeExecution";
import { fetchUrlTool } from "./tools/fetchUrl";
import { webSearchTool } from "./tools/webSearch";
import {
	editWorkspaceFileTool,
	listWorkspaceFilesTool,
	readWorkspaceFileTool,
	resetWorkspaceTool,
	searchWorkspaceTool,
	sendWorkspaceFileTool,
	writeWorkspaceFileTool,
} from "./tools/workspaceTools";
import type {
	AgentTool,
	FunctionDeclaration,
	ToolExecutionContext,
} from "./types";

class ToolRegistry {
	private readonly tools: Map<string, AgentTool> = new Map();

	constructor(preloadDefaults = false) {
		if (preloadDefaults) {
			this.tools.set("web_search", webSearchTool);
			this.tools.set("fetch_url", fetchUrlTool);
			this.tools.set("execute_code", codeExecutionTool);
			this.tools.set("execute_bash", bashExecutionTool);
			this.tools.set("list_workspace_files", listWorkspaceFilesTool);
			this.tools.set("search_workspace", searchWorkspaceTool);
			this.tools.set("read_workspace_file", readWorkspaceFileTool);
			this.tools.set("write_workspace_file", writeWorkspaceFileTool);
			this.tools.set("edit_workspace_file", editWorkspaceFileTool);
			this.tools.set("send_workspace_file", sendWorkspaceFileTool);
			this.tools.set("reset_workspace", resetWorkspaceTool);
		}
	}

	public register(tool: AgentTool): void {
		if (!tool.name || typeof tool.execute !== "function") {
			throw new Error(
				`[ToolRegistry] Invalid tool definition for '${tool.name || "unnamed"}'`,
			);
		}
		this.tools.set(tool.name, tool);
		logger.info(`[ToolRegistry] Registered tool: ${tool.name}`);
	}

	public unregister(name: string): boolean {
		const removed = this.tools.delete(name);
		if (removed) {
			logger.info(`[ToolRegistry] Unregistered tool: ${name}`);
		}
		return removed;
	}

	private isToolActive(tool?: AgentTool): tool is AgentTool {
		return Boolean(tool && (!tool.isEnabled || tool.isEnabled()));
	}

	/**
	 * A tool is available when it is registered and its own `isEnabled` gate
	 * (if any) allows it. Enablement lives on each tool so the registry never
	 * hardcodes tool names.
	 */
	public isEnabled(name: string): boolean {
		return this.isToolActive(this.tools.get(name));
	}

	public hasTool(name: string): boolean {
		return this.isEnabled(name);
	}

	public getTool(name: string): AgentTool | undefined {
		const tool = this.tools.get(name);
		return this.isToolActive(tool) ? tool : undefined;
	}

	public getAllTools(): AgentTool[] {
		const enabled: AgentTool[] = [];
		for (const tool of this.tools.values()) {
			if (this.isToolActive(tool)) {
				enabled.push(tool);
			}
		}
		return enabled;
	}

	public get count(): number {
		let total = 0;
		for (const tool of this.tools.values()) {
			if (this.isToolActive(tool)) total++;
		}
		return total;
	}

	public getFunctionDeclarations(): FunctionDeclaration[] {
		return this.getAllTools().map((t) => ({
			name: t.name,
			description: t.description,
			parameters: t.parameters,
		}));
	}

	public async executeTool(
		name: string,
		args: Record<string, unknown>,
		context?: ToolExecutionContext,
	): Promise<unknown> {
		const tool = this.getTool(name);
		if (!tool) {
			logger.error(`[ToolRegistry] Tool '${name}' requested but not available`);
			return { error: `Tool '${name}' is not registered or is disabled.` };
		}
		try {
			logger.info(
				`[ToolRegistry] Executing tool '${name}' with args:`,
				JSON.stringify(args),
			);
			return await tool.execute(args, context);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`[ToolRegistry] Error executing tool '${name}':`, err);
			return { error: err.message || `Failed to execute tool '${name}'.` };
		}
	}
}

export const toolRegistry = new ToolRegistry(true);
