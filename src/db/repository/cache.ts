import type { MemoryItem } from "./types";

// Read-through cache for memory rows. Memory retrieval previously re-read every
// embedding BLOB from SQLite (up to 10k rows x 3072 floats) on *every* inbound
// message. Caching the decoded rows removes that repeated read while keeping the
// exact same ranking behaviour.
//
// Any memory mutation (insert/update/delete/prune) or opt-out change calls
// `invalidateMemoryCaches()`, which clears everything. Memory writes are
// infrequent relative to reads, so coarse invalidation keeps this simple and
// always correct.
const MAX_CACHED_CHATS = 64;
const MAX_CACHED_ROWS = 20_000;

const chatCache = new Map<string, MemoryItem[]>();
const userCache = new Map<number, MemoryItem[]>();
let cachedChatRows = 0;
let cachedUserRows = 0;

export function invalidateMemoryCaches(): void {
	chatCache.clear();
	userCache.clear();
	cachedChatRows = 0;
	cachedUserRows = 0;
}

export function readThroughChatMemories(
	key: string,
	build: () => MemoryItem[],
): MemoryItem[] {
	const hit = chatCache.get(key);
	if (hit) {
		// Refresh LRU position.
		chatCache.delete(key);
		chatCache.set(key, hit);
		return hit;
	}

	const items = build();
	chatCache.set(key, items);
	cachedChatRows += items.length;

	while (
		(cachedChatRows > MAX_CACHED_ROWS || chatCache.size > MAX_CACHED_CHATS) &&
		chatCache.size > 0
	) {
		const oldestKey = chatCache.keys().next().value as string | undefined;
		if (oldestKey === undefined) break;
		const evicted = chatCache.get(oldestKey);
		cachedChatRows -= evicted ? evicted.length : 0;
		chatCache.delete(oldestKey);
	}

	return items;
}

export function readThroughUserMemories(
	userId: number,
	build: () => MemoryItem[],
): MemoryItem[] {
	const hit = userCache.get(userId);
	if (hit) {
		userCache.delete(userId);
		userCache.set(userId, hit);
		return hit;
	}

	const items = build();
	userCache.set(userId, items);
	cachedUserRows += items.length;

	while (
		(cachedUserRows > MAX_CACHED_ROWS || userCache.size > MAX_CACHED_CHATS) &&
		userCache.size > 0
	) {
		const oldestKey = userCache.keys().next().value as number | undefined;
		if (oldestKey === undefined) break;
		const evicted = userCache.get(oldestKey);
		cachedUserRows -= evicted ? evicted.length : 0;
		userCache.delete(oldestKey);
	}

	return items;
}
