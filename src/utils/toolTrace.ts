import logger from "./logger";

interface ToolTraceEntry {
	id: string;
	traceId?: string;
	timestamp: string;
	chatId?: string;
	toolName: string;
	args: Record<string, unknown>;
	resultSnippet?: string;
	executionTimeMs?: number;
	step: number;
}

const MAX_TRACES = 100;
const traceBuffer: ToolTraceEntry[] = [];

export const ToolTraceLogger = {
	add(entry: Omit<ToolTraceEntry, "id" | "timestamp">): void {
		const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

		const newTrace: ToolTraceEntry = {
			id: Math.random().toString(36).substring(2, 9),
			timestamp,
			...entry,
		};

		traceBuffer.push(newTrace);
		if (traceBuffer.length > MAX_TRACES) {
			traceBuffer.shift();
		}

		const tracePrefix = entry.traceId ? `[Trace:${entry.traceId}] ` : "";
		logger.debug(
			`${tracePrefix}[ToolTrace] Logged tool call: ${entry.toolName} (Step ${entry.step})`,
		);
	},

	getAll(): ToolTraceEntry[] {
		return [...traceBuffer].reverse();
	},
};
