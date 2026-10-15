import logger from "../../utils/logger";
import { db } from "../index";
import {
	invalidateMemoryCaches,
	readThroughChatMemories,
	readThroughUserMemories,
} from "./cache";
import { stmts } from "./statements";
import type { MemoryItem, RepositorySelf } from "./types";
import { optedOutUserIds } from "./users";

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

function rowToMemoryItem(row: {
	id: number;
	memory_text: string;
	embedding: Uint8Array | null;
	created_at: number;
	user_id: number | null;
	category: string | null;
	expires_at: number | null;
}): MemoryItem {
	const emb = row.embedding
		? decodeEmbedding(row.embedding)
		: new Float32Array(0);

	return {
		id: row.id,
		text: row.memory_text,
		embedding: emb,
		normalizedEmbedding: emb,
		createdAt: row.created_at,
		userId: row.user_id,
		category:
			(row.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE",
		expiresAt: row.expires_at,
	};
}

export const memoryMethods = {
	/**
	 * Adds a new memory fact for a chat.
	 * Enforces a maximum of 10000 memories per chat — oldest is removed when limit is reached.
	 */
	addMemory(
		this: RepositorySelf,
		chatId: string,
		memoryText: string,
		embedding: number[] | Float32Array,
		options?: {
			userId?: number | null;
			category?: "PROFILE" | "DYNAMIC" | "TEMPORARY";
			ttlDays?: number | null;
		},
	): void {
		this.createChat(chatId, "");
		const countResult = stmts.getMemoryCount.get(chatId) as {
			count: number;
		} | null;
		const count = countResult ? countResult.count : 0;
		if (count >= 10000) {
			stmts.deleteOldestMemory.run(chatId);
			logger.info(
				`[Memory] Max memory limit (10000) reached for chat ${chatId}. Oldest memory removed.`,
			);
		}

		const now = Math.floor(Date.now() / 1000);
		const userId = options?.userId ?? null;
		const category = options?.category ?? "PROFILE";
		const expiresAt =
			typeof options?.ttlDays === "number" && options.ttlDays !== 0
				? now + options.ttlDays * 86400
				: null;

		const floatArray =
			embedding instanceof Float32Array
				? new Float32Array(embedding)
				: new Float32Array(embedding);

		const buffer = Buffer.from(
			floatArray.buffer,
			floatArray.byteOffset,
			floatArray.byteLength,
		);

		stmts.insertMemory.run(
			chatId,
			memoryText,
			buffer,
			now,
			userId,
			category,
			expiresAt,
		);
		invalidateMemoryCaches();
	},

	/**
	 * Retrieves all memory facts for a chat with their embeddings directly from SQLite.
	 */
	getMemories(
		this: RepositorySelf,
		chatId: string,
		includeOptedOut: boolean = false,
	): MemoryItem[] {
		return readThroughChatMemories(
			`${chatId}|${includeOptedOut ? 1 : 0}`,
			() => {
				const rows = stmts.getMemories.all(chatId) as {
					id: number;
					memory_text: string;
					embedding: Uint8Array | null;
					created_at: number;
					user_id: number | null;
					category: string | null;
					expires_at: number | null;
				}[];

				const parsed = rows.map(rowToMemoryItem);

				if (includeOptedOut || optedOutUserIds.size === 0) {
					return parsed;
				}

				return parsed.filter(
					(m) => !m.userId || !this.isUserOptedOut(m.userId),
				);
			},
		);
	},

	/**
	 * Prunes expired memories for a chat based on TTL.
	 */
	pruneExpiredMemories(chatId: string): number {
		const now = Math.floor(Date.now() / 1000);
		const deletedRows = stmts.pruneExpiredMemories.all(chatId, now) as {
			id: number;
		}[];
		const deletedCount = deletedRows.length;
		if (deletedCount > 0) {
			invalidateMemoryCaches();
			logger.info(
				`[Memory] Pruned ${deletedCount} expired memories for chat ${chatId}.`,
			);
		}
		return deletedCount;
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
			.filter((t) => t.length > 0);
		if (tokens.length === 0) return "";
		return tokens.map((t) => `"${t}"*`).join(" OR ");
	},

	/**
	 * Performs Full-Text Search on memories using SQLite FTS5 BM25 ranking.
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
			const rows = stmts.searchMemoriesFTS.all(
				sanitized,
				chatId,
				limit,
			) as Array<{
				id: number;
				memory_text: string;
				rank: number;
			}>;
			return rows.map((r) => ({
				id: r.id,
				text: r.memory_text,
				rank: r.rank,
			}));
		} catch (err) {
			logger.warn(`[Repository] FTS search failed for query "${query}":`, err);
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
	 * Updates an existing memory's text and category.
	 */
	updateMemory(
		id: number,
		text: string,
		category?: string,
		embedding?: number[] | Float32Array,
	): void {
		const cat = (category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE";
		if (embedding && embedding.length > 0) {
			const floatArray =
				embedding instanceof Float32Array
					? new Float32Array(embedding)
					: new Float32Array(embedding);
			const buffer = Buffer.from(
				floatArray.buffer,
				floatArray.byteOffset,
				floatArray.byteLength,
			);
			stmts.updateMemoryWithEmbedding.run(text, cat, buffer, id);
		} else {
			stmts.updateMemoryWithoutEmbedding.run(text, cat, id);
		}
		invalidateMemoryCaches();
	},

	/**
	 * Clears all memories for a chat.
	 */
	clearMemories(chatId: string): void {
		stmts.deleteMemories.run(chatId);
		invalidateMemoryCaches();
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
	getMemoryById(id: number): {
		id: number;
		chat_id: string;
		memory_text: string;
		created_at: number;
		user_id: number | null;
		category: string;
		expires_at: number | null;
	} | null {
		return stmts.getMemoryById.get(id) as {
			id: number;
			chat_id: string;
			memory_text: string;
			created_at: number;
			user_id: number | null;
			category: string;
			expires_at: number | null;
		} | null;
	},

	/**
	 * Gets memories associated with a specific user in a chat.
	 */
	getUserMemories(
		this: RepositorySelf,
		chatId: string,
		userId: number,
	): MemoryItem[] {
		if (this.isUserOptedOut(userId)) return [];
		const all = this.getMemories(chatId);
		return all.filter((m) => m.userId === userId);
	},

	/**
	 * Retrieves personal memories/facts saved about a specific user across all chats,
	 * including their embeddings so they can participate in dense (cosine) ranking.
	 */
	getUserAllMemories(this: RepositorySelf, userId: number): MemoryItem[] {
		if (this.isUserOptedOut(userId)) return [];
		return readThroughUserMemories(userId, () => {
			const rows = stmts.getUserMemories.all(userId) as {
				id: number;
				chat_id: string;
				memory_text: string;
				embedding: Uint8Array | null;
				created_at: number;
				user_id: number | null;
				category: string | null;
				expires_at: number | null;
			}[];
			return rows.map(rowToMemoryItem);
		});
	},
};
