import type { ExecutionRecord } from "./types";

export const executions = new Map<string, ExecutionRecord>();
const sessionLocks = new Map<string, Promise<void>>();

export function createExecution(sessionId?: string, requestedId?: string): ExecutionRecord {
	const executionId =
		requestedId?.match(/^[a-zA-Z0-9_-]{1,96}$/)?.[0] ||
		`exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
	const record: ExecutionRecord = {
		executionId,
		sessionId,
		status: "queued",
	};
	executions.set(executionId, record);
	return record;
}

export async function acquireSessionLock(sessionId?: string): Promise<() => void> {
	if (!sessionId) return () => {};
	const previous = sessionLocks.get(sessionId) || Promise.resolve();
	let releaseCurrent!: () => void;
	const current = new Promise<void>((resolve) => {
		releaseCurrent = resolve;
	});
	const lock = previous.then(() => current);
	sessionLocks.set(sessionId, lock);
	await previous;
	return () => {
		releaseCurrent();
		if (sessionLocks.get(sessionId) === lock) sessionLocks.delete(sessionId);
	};
}
