import logger from "../utils/logger";
import type {
	AgentTool,
	FunctionDeclaration,
	ToolExecutionContext,
} from "./types";

/** @internal */
export class ToolRegistry {
	private readonly tools: Map<string, AgentTool> = new Map();

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

	public hasTool(name: string): boolean {
		return this.tools.has(name);
	}

	public getTool(name: string): AgentTool | undefined {
		return this.tools.get(name);
	}

	public getAllTools(): AgentTool[] {
		return Array.from(this.tools.values());
	}

	public getFunctionDeclarations(): FunctionDeclaration[] {
		return Array.from(this.tools.values()).map((tool) => ({
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		}));
	}

	public async executeTool(
		name: string,
		args: Record<string, unknown>,
		context?: ToolExecutionContext,
	): Promise<unknown> {
		const tool = this.tools.get(name);
		if (!tool) {
			logger.error(`[ToolRegistry] Tool '${name}' requested but not found`);
			return { error: `Tool '${name}' is not registered.` };
		}

		try {
			logger.info(
				`[ToolRegistry] Executing tool '${name}' with args:`,
				JSON.stringify(args),
			);
			const result = await tool.execute(args, context);
			logger.debug(
				`[ToolRegistry] Tool '${name}' execution result:`,
				JSON.stringify(result),
			);
			return result;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`[ToolRegistry] Error executing tool '${name}':`, err);
			return { error: err.message || `Failed to execute tool '${name}'.` };
		}
	}

	public get count(): number {
		return this.tools.size;
	}
}

export const toolRegistry = new ToolRegistry();
