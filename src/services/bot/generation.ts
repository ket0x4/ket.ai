import { CONFIG } from "../../config";

// Tracks the in-flight generation per chat so it can be cancelled (by `/stop`)
// or bounded by an overall timeout. The bot processes updates concurrently, but
// `withChatLock` guarantees at most one generation per chat is active at a time.
const activeGenerations = new Map<string, AbortController>();

export interface ActiveGeneration {
	/** Aborts the generation on demand (see `abortGeneration`). */
	controller: AbortController;
	/** Combined signal (manual abort + agent timeout) to pass into the LLM loop. */
	signal: AbortSignal;
	/** Clears the registration; call in a `finally` block. */
	finish: () => void;
}

/**
 * Registers a new generation for a chat and returns the signal to thread through
 * the agent loop. Any previously registered generation for the chat is aborted
 * first. The resulting signal fires when either the caller aborts, `/stop` is
 * used, or the overall agent timeout elapses.
 */
export function startGeneration(chatId: string): ActiveGeneration {
	const existing = activeGenerations.get(chatId);
	if (existing) existing.abort();

	const controller = new AbortController();
	const signal = AbortSignal.any([
		controller.signal,
		AbortSignal.timeout(CONFIG.AGENT_TIMEOUT_MS),
	]);

	activeGenerations.set(chatId, controller);

	const finish = () => {
		if (activeGenerations.get(chatId) === controller) {
			activeGenerations.delete(chatId);
		}
	};

	return { controller, signal, finish };
}

/** Aborts the active generation for a chat. Returns whether one was running. */
export function abortGeneration(chatId: string): boolean {
	const controller = activeGenerations.get(chatId);
	if (!controller) return false;
	controller.abort();
	activeGenerations.delete(chatId);
	return true;
}
