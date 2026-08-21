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
		const d = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

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

	clear(): void {
		traceBuffer.length = 0;
	},
};
