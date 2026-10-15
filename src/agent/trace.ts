import logger from "../utils/logger";

export type AgentTraceKind =
	| "step-start"
	| "step-complete"
	| "loop-detected"
	| "final";

export interface AgentTraceEntry {
	id: string;
	traceId: string;
	timestamp: string;
	kind: AgentTraceKind;
	step: number;
	detail?: string;
	toolCount?: number;
	suppressedCount?: number;
}

const MAX_TRACE_ENTRIES = 500;
const traceBuffer: AgentTraceEntry[] = [];

/**
 * Lightweight, bounded, in-memory transcript of the agent loop: step
 * boundaries, loop-detection interventions, and termination. Complements the
 * per-tool `ToolTraceLogger` with the control-flow view needed for debugging
 * and eval replay.
 */
export const AgentTraceLogger = {
	add(
		entry: Omit<AgentTraceEntry, "id" | "timestamp"> &
			Partial<Pick<AgentTraceEntry, "detail">>,
	): void {
		const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
		traceBuffer.push({
			id: Math.random().toString(36).substring(2, 9),
			timestamp,
			...entry,
		});
		if (traceBuffer.length > MAX_TRACE_ENTRIES) {
			traceBuffer.shift();
		}
		logger.debug(
			`[Trace:${entry.traceId}][AgentTrace] ${entry.kind} @ step ${entry.step}${entry.detail ? ` (${entry.detail})` : ""}`,
		);
	},

	/** Returns entries for a given trace (chronological), or all (newest first). */
	getAll(traceId?: string): AgentTraceEntry[] {
		if (traceId) {
			return traceBuffer.filter((e) => e.traceId === traceId);
		}
		return [...traceBuffer].reverse();
	},

	clear(): void {
		traceBuffer.length = 0;
	},
};
