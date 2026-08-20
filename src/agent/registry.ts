import logger from "../utils/logger";
import type { AgentTool, FunctionDeclaration } from "./types";

export class ToolRegistry {
	private tools: Map<string, AgentTool> = new Map();

	/**
	 * Registers a new agent tool.
	 * Overwrites any existing tool with the same name.
	 */
	public register(tool: AgentTool): void {
		if (!tool.name || typeof tool.execute !== "function") {
			throw new Error(
				`[ToolRegistry] Invalid tool definition for '${tool.name || "unnamed"}'`,
			);
		}
		this.tools.set(tool.name, tool);
		logger.info(`[ToolRegistry] Registered tool: ${tool.name}`);
	}

	/**
	 * Unregisters a tool by name.
	 */
	public unregister(name: string): boolean {
		const removed = this.tools.delete(name);
		if (removed) {
			logger.info(`[ToolRegistry] Unregistered tool: ${name}`);
		}
		return removed;
	}

	/**
	 * Checks if a tool is registered.
	 */
	public hasTool(name: string): boolean {
		return this.tools.has(name);
	}

	/**
	 * Returns a specific registered tool.
	 */
	public getTool(name: string): AgentTool | undefined {
		return this.tools.get(name);
	}

	/**
	 * Converts registered tools into function declarations suitable for Gemini SDK.
	 */
	public getFunctionDeclarations(): FunctionDeclaration[] {
		const declarations: FunctionDeclaration[] = [];
		for (const tool of this.tools.values()) {
			declarations.push({
				name: tool.name,
				description: tool.description,
				parameters: tool.parameters,
			});
		}
		return declarations;
	}

	/**
	 * Executes a registered tool by name with provided arguments.
	 */
	public async executeTool(
		name: string,
		args: Record<string, unknown>,
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
			const result = await tool.execute(args);
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

	/**
	 * Returns total count of registered tools.
	 */
	public get count(): number {
		return this.tools.size;
	}
}

export const toolRegistry = new ToolRegistry();
