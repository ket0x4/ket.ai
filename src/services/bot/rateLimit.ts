// Lightweight in-memory sliding-window rate limiter. Keys are namespaced strings
// such as `msg:<userId>`, `gen:<chatId>`, or `api:<ip>`. This is intentionally
// process-local: it protects a single bot instance from runaway cost/abuse.
const MAX_TRACKED_KEYS = 20_000;
const windows = new Map<string, number[]>();

function pruneIfNeeded(): void {
	if (windows.size <= MAX_TRACKED_KEYS) return;
	const overflow = windows.size - MAX_TRACKED_KEYS;
	let removed = 0;
	for (const key of windows.keys()) {
		windows.delete(key);
		if (++removed >= overflow) break;
	}
}

/**
 * Records an event for `key` and reports whether it is within `limit` events per
 * `windowMs`. Returns `false` (and records nothing) once the limit is exceeded.
 */
export function checkRateLimit(
	key: string,
	limit: number,
	windowMs = 60_000,
): boolean {
	if (limit <= 0) return true;

	const now = Date.now();
	const cutoff = now - windowMs;
	const timestamps = windows.get(key);

	if (!timestamps) {
		windows.set(key, [now]);
		pruneIfNeeded();
		return true;
	}

	let firstFresh = 0;
	while (firstFresh < timestamps.length && timestamps[firstFresh] <= cutoff) {
		firstFresh++;
	}
	if (firstFresh > 0) timestamps.splice(0, firstFresh);

	if (timestamps.length >= limit) return false;

	timestamps.push(now);
	return true;
}
