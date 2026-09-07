import { CONFIG } from "../config/index";
import logger from "../utils/logger";
import { codeExecutionTool } from "./tools/codeExecution";
import { webSearchTool } from "./tools/webSearch";
import type {
	AgentTool,
	FunctionDeclaration,
	ToolExecutionContext,
} from "./types";

export class ToolRegistry {
private readonly tools: Map<string, AgentTool> = new Map();

	constructor(preloadDefaults = false) {
		if (preloadDefaults) {
			this.tools.set("web_search", webSearchTool);
			this.tools.set("execute_code", codeExecutionTool);
		}
	}

	public register(tool: AgentTool): void {
		if (!tool.name || typeof tool.execute !== "function") {
			throw new Error(
				`[ToolRegistry] Invalid tool definition for '${tool.name || "unnamed"}'`,
			);
		}

		}
	}

	register(tool: AgentTool): void {
		this.tools.set(tool.name, tool);
	}


	public unregister(name: string): boolean {
		const removed = this.tools.delete(name);
		if (removed) {
			logger.info(`[ToolRegistry] Unregistered tool: ${name}`);
		}
		return removed;
	}

	public hasTool(name: string): boolean {
		if (!this.tools.has(name)) return false;
		if (name === "web_search") return Boolean(CONFIG.ENABLE_WEB_SEARCH);
		if (name === "execute_code") return Boolean(CONFIG.ENABLE_CODE_EXECUTION);
		return true;
	}

	public getTool(name: string): AgentTool | undefined {
		return this.hasTool(name) ? this.tools.get(name) : undefined;
	}

	public getAllTools(): AgentTool[] {
		return Array.from(this.tools.values()).filter((t) => this.hasTool(t.name));
	}

	public get count(): number {
		return this.getAllTools().length;
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
			logger.error(`[ToolRegistry] Tool '${name}' requested but not found`);
			return { error: `Tool '${name}' is not registered.` };
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
