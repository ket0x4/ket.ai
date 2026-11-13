import logger from "../../utils/logger";
import { db } from "../index";
import {
	invalidateMemoryCaches,
	readThroughChatMemories,
	readThroughUserMemories,
} from "./cache";
import { stmts } from "./statements";
import type {
	MemoryCategory,
	MemoryItem,
	MemoryRow,
	RepositorySelf,
} from "./types";
import { optedOutUserIds } from "./users";

const MAX_MEMORIES_PER_CHAT = 10_000;

/**
 * Decodes a stored embedding BLOB into an owned Float32Array. An owned copy is
 * required because the cache keeps these vectors alive across queries, so they
 * must not alias a SQLite-provided buffer that could be reused.
 */
function decodeEmbedding(bytes: Uint8Array): Float32Array {
	if (bytes.byteLength === 0) return new Float32Array(0);
	if (bytes.byteOffset % 4 === 0) {
		return new Float32Array(
			bytes.buffer,
			bytes.byteOffset,
			bytes.byteLength / 4,
		).slice();
	}
	return new Float32Array(
		bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
	);
}

function encodeEmbedding(embedding: number[] | Float32Array): Buffer {
	const floats =
		embedding instanceof Float32Array
			? new Float32Array(embedding)
			: new Float32Array(embedding);
	return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
}

function rowToMemoryItem(row: MemoryRow): MemoryItem {
	return {
		id: row.id,
		text: row.content,
		embedding: row.embedding
			? decodeEmbedding(row.embedding)
			: new Float32Array(0),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		userId: row.user_id,
		category: row.category,
		expiresAt: row.expires_at,
	};
}

export const memoryMethods = {
	/**
	 * Adds a memory fact. Enforces the per-chat limit by removing the oldest
	 * lowest-priority fact when the limit is reached.
	 */
	addMemory(
		this: RepositorySelf,
		chatId: string,
		content: string,
		embedding: number[] | Float32Array,
		options?: {
			userId?: number | null;
			category?: MemoryCategory;
			ttlDays?: number | null;
		},
	): void {
		this.createChat(chatId, "");

		const countResult = stmts.getMemoryCount.get(chatId) as {
			count: number;
		} | null;
		if ((countResult?.count || 0) >= MAX_MEMORIES_PER_CHAT) {
			stmts.deleteOldestMemory.run(chatId);
			logger.info(
				`[Memory] Limit ${MAX_MEMORIES_PER_CHAT} reached for chat ${chatId}; oldest memory removed.`,
			);
		}

		const now = Math.floor(Date.now() / 1000);
		const userId = options?.userId ?? null;
		const category = options?.category ?? "PROFILE";
		const expiresAt =
			typeof options?.ttlDays === "number" && options.ttlDays !== 0
				? now + options.ttlDays * 86400
				: null;

		stmts.insertMemory.run(
			chatId,
			content,
			encodeEmbedding(embedding),
			now,
			now,
			userId,
			category,
			expiresAt,
		);
		invalidateMemoryCaches();
	},

	/**
	 * Retrieves all memory facts for a chat, excluding opted-out users.
	 */
	getMemories(this: RepositorySelf, chatId: string): MemoryItem[] {
		return readThroughChatMemories(chatId, () => {
			const rows = stmts.getMemories.all(chatId) as MemoryRow[];
			const parsed = rows.map(rowToMemoryItem);
			if (optedOutUserIds.size === 0) return parsed;
			return parsed.filter(
				(memory) => !memory.userId || !this.isUserOptedOut(memory.userId),
			);
		});
	},

	/**
	 * Deletes expired memories for one chat, or for every chat when omitted.
	 */
	pruneExpiredMemories(chatId?: string): number {
		const now = Math.floor(Date.now() / 1000);
		const rows = (
			chatId
				? stmts.pruneExpiredMemories.all(chatId, now)
				: stmts.pruneAllExpiredMemories.all(now)
		) as Array<{ id: number }>;

		if (rows.length > 0) {
			invalidateMemoryCaches();
			logger.info(
				`[Memory] Pruned ${rows.length} expired memories${chatId ? ` for chat ${chatId}` : ""}.`,
			);
		}
		return rows.length;
	},

	/**
	 * Sanitizes a search query into safe FTS5 MATCH format with prefix tokens.
	 */
	sanitizeFtsQuery(query: string): string {
		if (!query) return "";
		const tokens = query
			.replace(/[^\p{L}\p{N}\s_]/gu, " ")
			.trim()
			.split(/\s+/)
			.filter((token) => token.length > 0);
		if (tokens.length === 0) return "";
		return tokens.map((token) => `"${token}"*`).join(" OR ");
	},

	/**
	 * Performs full-text search on a single chat using FTS5 BM25 ranking.
	 */
	searchMemoriesFTS(
		this: RepositorySelf,
		chatId: string,
		query: string,
		limit: number = 10,
	): Array<{ id: number; text: string; rank: number }> {
		const sanitized = this.sanitizeFtsQuery(query);
		if (!sanitized) return [];

		try {
			return stmts.searchMemoriesFTS.all(sanitized, chatId, limit) as Array<{
				id: number;
				text: string;
				rank: number;
			}>;
		} catch (error) {
			logger.warn(
				`[Repository] FTS search failed for query "${query}":`,
				error,
			);
			return [];
		}
	},

	/**
	 * Deletes specific memories by their IDs.
	 */
	deleteMemoriesByIds(ids: number[]): void {
		if (ids.length === 0) return;
		const deleteMany = db.transaction((memoryIds: number[]) => {
			for (const id of memoryIds) {
				stmts.deleteMemoryById.run(id);
			}
		});
		deleteMany(ids);
		invalidateMemoryCaches();
	},

	/**
	 * Updates a memory in place. Omitted fields keep their current values.
	 */
	updateMemory(
		id: number,
		updates: {
			content?: string;
			category?: MemoryCategory;
			embedding?: number[] | Float32Array;
		},
	): MemoryRow | null {
		const existing = stmts.getMemoryById.get(id) as MemoryRow | null;
		if (!existing) return null;

		const content = updates.content ?? existing.content;
		const category = updates.category ?? existing.category;
		const now = Math.floor(Date.now() / 1000);

		if (updates.embedding && updates.embedding.length > 0) {
			stmts.updateMemoryWithEmbedding.run(
				content,
				category,
				encodeEmbedding(updates.embedding),
				now,
				id,
			);
		} else {
			stmts.updateMemoryWithoutEmbedding.run(content, category, now, id);
		}

		invalidateMemoryCaches();
		return { ...existing, content, category, updated_at: now };
	},

	/**
	 * Returns the total count of memories stored for a given chat ID.
	 */
	getMemoryCount(chatId: string): number {
		const result = stmts.getMemoryCount.get(chatId) as { count: number } | null;
		return result?.count || 0;
	},

	/**
	 * Retrieves a single memory row by ID.
	 */
	getMemoryById(id: number): MemoryRow | null {
		return (stmts.getMemoryById.get(id) as MemoryRow | null) || null;
	},

	/**
	 * Retrieves personal memories/facts saved about a specific user across all
	 * chats, including embeddings for dense ranking.
	 */
	getUserAllMemories(this: RepositorySelf, userId: number): MemoryItem[] {
		if (this.isUserOptedOut(userId)) return [];
		return readThroughUserMemories(userId, () => {
			const rows = stmts.getUserMemories.all(userId) as MemoryRow[];
			return rows.map(rowToMemoryItem);
		});
	},
};
