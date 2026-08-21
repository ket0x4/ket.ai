import { CONFIG } from "../config/index";
import logger from "../utils/logger";
import { db } from "./index";

interface ChatRow {
	chat_id: string;
	title: string | null;
	reply_probability: number;
	last_random_reply_at: number;
	current_topic: string | null;
	is_allowed: number; // 0 or 1
	active_persona_id: string | null;
	created_at: number;
}

interface PersonaRow {
	id: string;
	name: string;
	description: string | null;
	prompt: string;
	emoji: string;
	is_system: number; // 0 or 1
	created_by: number | null;
	created_at: number;
	updated_at: number;
}

export interface MessageRow {
	id: number;
	chat_id: string;
	message_id: number;
	user_id: number;
	username: string | null;
	first_name: string | null;
	reply_to_message_id: number | null;
	text: string | null;
	photo_file_id: string | null;
	is_bot_reply: number; // 0 or 1
	sent_at: number;
}

// Pre-compiled prepared statements for better performance
const stmts = {
	getChat: db.prepare("SELECT * FROM chats WHERE chat_id = ?"),
	insertChat: db.prepare(
		`INSERT INTO chats (chat_id, title, reply_probability, is_allowed, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(chat_id) DO NOTHING`,
	),
	setChatAllowed: db.prepare(
		"UPDATE chats SET is_allowed = ? WHERE chat_id = ?",
	),

	// Persona statements
	getAllPersonas: db.prepare(
		"SELECT * FROM personas ORDER BY is_system DESC, created_at DESC",
	),
	getPersonaById: db.prepare("SELECT * FROM personas WHERE id = ?"),
	insertPersona: db.prepare(
		`INSERT INTO personas (id, name, description, prompt, emoji, is_system, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	),
	updatePersona: db.prepare(
		`UPDATE personas SET name = ?, description = ?, prompt = ?, emoji = ?, updated_at = ? WHERE id = ?`,
	),
	deletePersona: db.prepare(
		"DELETE FROM personas WHERE id = ? AND is_system = 0",
	),
	getChatActivePersona: db.prepare(
		`SELECT p.* FROM personas p
     JOIN chats c ON c.active_persona_id = p.id
     WHERE c.chat_id = ?`,
	),
	setChatActivePersona: db.prepare(
		"UPDATE chats SET active_persona_id = ? WHERE chat_id = ?",
	),
	clearChatActivePersonaIfMatches: db.prepare(
		"UPDATE chats SET active_persona_id = NULL WHERE active_persona_id = ?",
	),

	insertUser: db.prepare(
		`INSERT INTO users (user_id, username, first_name, last_updated) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET 
       username = excluded.username,
       first_name = excluded.first_name,
       last_updated = excluded.last_updated`,
	),

	insertMessage: db.prepare(
		`INSERT INTO messages (chat_id, message_id, user_id, reply_to_message_id, text, photo_file_id, is_bot_reply, sent_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(chat_id, message_id) DO UPDATE SET
       text = excluded.text,
       photo_file_id = excluded.photo_file_id`,
	),

	getRecentMessages: db.prepare(
		`SELECT m.*, u.username, u.first_name 
     FROM (SELECT * FROM messages WHERE chat_id = ? ORDER BY sent_at DESC, id DESC LIMIT ?) m
     LEFT JOIN users u ON m.user_id = u.user_id
     ORDER BY m.sent_at ASC, m.id ASC`,
	),
	getMessageCount: db.prepare(
		"SELECT COUNT(*) as count FROM messages WHERE chat_id = ?",
	),
	deleteMessages: db.prepare("DELETE FROM messages WHERE chat_id = ?"),
	deleteMemories: db.prepare("DELETE FROM memories WHERE chat_id = ?"),
	resetTopic: db.prepare(
		"UPDATE chats SET current_topic = NULL WHERE chat_id = ?",
	),

	insertMemory: db.prepare(
		"INSERT INTO memories (chat_id, memory_text, embedding, created_at, user_id, category, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
	),
	getMemories: db.prepare(
		"SELECT id, memory_text, embedding, created_at, user_id, category, expires_at FROM memories WHERE chat_id = ? ORDER BY created_at ASC",
	),
	deleteMemoryById: db.prepare("DELETE FROM memories WHERE id = ?"),
	getMemoryById: db.prepare(
		"SELECT id, chat_id, memory_text, embedding, created_at, user_id, category, expires_at FROM memories WHERE id = ?",
	),
	getUserMemberChatIds: db.prepare(
		"SELECT DISTINCT chat_id FROM messages WHERE user_id = ?",
	),
	getUserMemories: db.prepare(
		"SELECT id, chat_id, memory_text, created_at, user_id, category, expires_at FROM memories WHERE user_id = ? ORDER BY created_at DESC",
	),
	getUserStats: db.prepare(
		`SELECT 
       (SELECT COUNT(*) FROM messages WHERE user_id = ?) as total_messages,
       (SELECT COUNT(*) FROM memories WHERE user_id = ?) as total_memories,
       (SELECT COUNT(DISTINCT chat_id) FROM messages WHERE user_id = ?) as total_groups`,
	),
	getMemoryCount: db.prepare(
		"SELECT COUNT(*) as count FROM memories WHERE chat_id = ?",
	),
	deleteOldestMemory: db.prepare(
		`DELETE FROM memories WHERE id = (SELECT id FROM memories WHERE chat_id = ? ORDER BY created_at ASC LIMIT 1)`,
	),
	pruneExpiredMemories: db.prepare(
		"DELETE FROM memories WHERE chat_id = ? AND expires_at IS NOT NULL AND expires_at <= ?",
	),
	pruneOldMessages: db.prepare(
		"DELETE FROM messages WHERE chat_id = ? AND sent_at < ?",
	),
	getChatStats: db.prepare(
		`SELECT COUNT(*) as total_messages, COUNT(DISTINCT user_id) as unique_users FROM messages WHERE chat_id = ?`,
	),
	getTopUsers: db.prepare(
		`SELECT u.first_name, COUNT(m.id) as msg_count 
     FROM messages m 
     JOIN users u ON m.user_id = u.user_id 
     WHERE m.chat_id = ? AND m.is_bot_reply = 0 
     GROUP BY m.user_id 
     ORDER BY msg_count DESC 
     LIMIT 5`,
	),
	getTodayMessageCount: db.prepare(
		`SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND sent_at >= ?`,
	),
	updateMessageText: db.prepare(
		"UPDATE messages SET text = ? WHERE chat_id = ? AND message_id = ?",
	),
	updateChatIdForChats: db.prepare(
		"UPDATE chats SET chat_id = ? WHERE chat_id = ?",
	),
	updateChatIdForMessages: db.prepare(
		"UPDATE messages SET chat_id = ? WHERE chat_id = ?",
	),
	updateChatIdForMemories: db.prepare(
		"UPDATE memories SET chat_id = ? WHERE chat_id = ?",
	),
};

interface MemoryItem {
	id: number;
	text: string;
	embedding: number[];
	createdAt: number;
	userId: number | null;
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY";
	expiresAt: number | null;
}

// In-memory cache for parsed memory embeddings per chat to optimize RAG lookups
const memoryCache = new Map<string, MemoryItem[]>();

export const Repository = {
	/**
	 * Clears the in-memory memory cache for a specific chat or all chats.
	 */
	clearMemoryCache(chatId?: string): void {
		if (chatId) {
			memoryCache.delete(chatId);
		} else {
			memoryCache.clear();
		}
	},

	/**
	 * Seeds the database with a list of initially allowed chat IDs from config.
	 */
	initSeedAllowedChats(chatIds: string[]): void {
		if (!chatIds || chatIds.length === 0) return;

		logger.info(
			`[Repository] Seeding allowed chats from config: ${chatIds.join(", ")}`,
		);
		const transaction = db.transaction((ids: string[]) => {
			const now = Math.floor(Date.now() / 1000);
			const defaultProb = CONFIG.DEFAULT_REPLY_PROBABILITY;

			for (const id of ids) {
				const existing = stmts.getChat.get(id) as ChatRow | null;
				if (!existing) {
					stmts.insertChat.run(id, "Seeded Group", defaultProb, 1, now);
				} else if (existing.is_allowed === 0) {
					stmts.setChatAllowed.run(1, id);
				}
			}
		});
		transaction(chatIds);
	},

	/**
	 * Migrates chat ID for a group (useful when a group is upgraded to a supergroup).
	 */
	migrateChat(oldChatId: string, newChatId: string): void {
		logger.info(`[Repository] Migrating chat ID ${oldChatId} -> ${newChatId}`);

		// Check if new chat already exists (edge case)
		const newChatExists = stmts.getChat.get(newChatId) as ChatRow | null;
		if (newChatExists) {
			logger.warn(
				`[Repository] Target chat ID ${newChatId} already exists. Skipping migration.`,
			);
			return;
		}

		const transaction = db.transaction(() => {
			stmts.updateChatIdForChats.run(newChatId, oldChatId);
			stmts.updateChatIdForMessages.run(newChatId, oldChatId);
			stmts.updateChatIdForMemories.run(newChatId, oldChatId);
		});

		transaction();
		this.clearMemoryCache(oldChatId);
		this.clearMemoryCache(newChatId);
	},

	/**
	 * Retrieves a chat configuration by its chat ID.
	 */
	getChat(chatId: string): ChatRow | null {
		return stmts.getChat.get(chatId) as ChatRow | null;
	},

	/**
	 * Creates a new chat entry if it doesn't already exist.
	 */
	createChat(
		chatId: string,
		title: string = "",
		isAllowed: boolean = false,
	): ChatRow {
		const existing = this.getChat(chatId);
		if (existing) return existing;

		const now = Math.floor(Date.now() / 1000);
		const isAllowedInt = isAllowed ? 1 : 0;
		const defaultProb = CONFIG.DEFAULT_REPLY_PROBABILITY;

		stmts.insertChat.run(chatId, title, defaultProb, isAllowedInt, now);
		const created = this.getChat(chatId);
		if (!created) {
			throw new Error(`Failed to create or retrieve chat '${chatId}'`);
		}
		return created;
	},

	/**
	 * Updates allowed status for a chat.
	 */
	setChatAllowed(chatId: string, allowed: boolean): void {
		stmts.setChatAllowed.run(allowed ? 1 : 0, chatId);
	},

	/**
	 * Updates chat settings (reply probability, active topic, etc.).
	 * Uses dynamic SQL since fields are optional.
	 */
	updateChatSettings(
		chatId: string,
		settings: {
			title?: string;
			reply_probability?: number;
			last_random_reply_at?: number;
			current_topic?: string | null;
		},
	): void {
		const updates: string[] = [];
		const params: (string | number | null)[] = [];

		if (settings.title !== undefined) {
			updates.push("title = ?");
			params.push(settings.title);
		}
		if (settings.reply_probability !== undefined) {
			updates.push("reply_probability = ?");
			params.push(settings.reply_probability);
		}
		if (settings.last_random_reply_at !== undefined) {
			updates.push("last_random_reply_at = ?");
			params.push(settings.last_random_reply_at);
		}
		if (settings.current_topic !== undefined) {
			updates.push("current_topic = ?");
			params.push(settings.current_topic);
		}

		if (updates.length === 0) return;

		params.push(chatId);
		db.run(`UPDATE chats SET ${updates.join(", ")} WHERE chat_id = ?`, params);
	},

	/**
	 * Saves a message to the group chat history.
	 */
	saveMessage(params: {
		chatId: string;
		messageId: number;
		userId: number;
		username?: string;
		firstName?: string;
		replyToMessageId?: number;
		text?: string;
		photoFileId?: string;
		isBotReply?: boolean;
		sentAt: number;
	}): void {
		const transaction = db.transaction(() => {
			// Upsert User
			stmts.insertUser.run(
				params.userId,
				params.username || null,
				params.firstName || null,
				params.sentAt,
			);

			// Insert Message
			stmts.insertMessage.run(
				params.chatId,
				params.messageId,
				params.userId,
				params.replyToMessageId || null,
				params.text || null,
				params.photoFileId || null,
				params.isBotReply ? 1 : 0,
				params.sentAt,
			);
		});

		transaction();
	},

	/**
	 * Updates text of an existing message in SQLite history.
	 * Returns true if a record was updated.
	 */
	updateMessageText(chatId: string, messageId: number, text: string): boolean {
		const result = stmts.updateMessageText.run(text, chatId, messageId);
		return result.changes > 0;
	},

	/**
	 * Gets recent messages for sliding window context (ordered chronologically).
	 */
	getRecentMessages(chatId: string, limit: number = 15): MessageRow[] {
		return stmts.getRecentMessages.all(chatId, limit) as MessageRow[];
	},

	/**
	 * Counts total messages in a chat (used to decide when to run summarization).
	 */
	getMessageCount(chatId: string): number {
		const result = stmts.getMessageCount.get(chatId) as {
			count: number;
		} | null;
		return result ? result.count : 0;
	},

	/**
	 * Clears chat history and long-term memories for a group (e.g. on reset).
	 */
	clearChatHistory(chatId: string): void {
		const transaction = db.transaction(() => {
			stmts.deleteMessages.run(chatId);
			stmts.deleteMemories.run(chatId);
			stmts.resetTopic.run(chatId);
		});
		transaction();
		this.clearMemoryCache(chatId);
	},

	/**
	 * Adds a new memory fact for a chat.
	 * Enforces a maximum of 10000 memories per chat — oldest is removed when limit is reached.
	 */
	addMemory(
		chatId: string,
		memoryText: string,
		embedding: number[],
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

		// Convert number[] to binary BLOB via Float32Array
		const buffer = Buffer.from(new Float32Array(embedding).buffer);

		stmts.insertMemory.run(
			chatId,
			memoryText,
			buffer, // using BLOB
			now,
			userId,
			category,
			expiresAt,
		);
		memoryCache.delete(chatId);
	},

	/**
	 * Retrieves all memory facts for a chat with their embeddings (cached in-memory).
	 */
	getMemories(chatId: string): MemoryItem[] {
		const cached = memoryCache.get(chatId);
		if (cached) {
			return cached;
		}

		const rows = stmts.getMemories.all(chatId) as {
			id: number;
			memory_text: string;
			embedding: Uint8Array | null;
			created_at: number;
			user_id: number | null;
			category: string | null;
			expires_at: number | null;
		}[];

		const parsed: MemoryItem[] = rows.map((row) => {
			let embeddingArray: number[] = [];
			if (row.embedding) {
				// Convert BLOB back to number[]
				const floatArray = new Float32Array(
					row.embedding.buffer,
					row.embedding.byteOffset,
					row.embedding.byteLength / 4,
				);
				embeddingArray = Array.from(floatArray);
			}
			return {
				id: row.id,
				text: row.memory_text,
				embedding: embeddingArray,
				createdAt: row.created_at,
				userId: row.user_id,
				category:
					(row.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE",
				expiresAt: row.expires_at,
			};
		});

		memoryCache.set(chatId, parsed);
		return parsed;
	},

	/**
	 * Prunes expired memories for a chat based on TTL.
	 */
	pruneExpiredMemories(chatId: string): number {
		const now = Math.floor(Date.now() / 1000);
		const result = stmts.pruneExpiredMemories.run(chatId, now);
		if (result.changes > 0) {
			memoryCache.delete(chatId);
			logger.info(
				`[Memory] Pruned ${result.changes} expired memories for chat ${chatId}.`,
			);
		}
		return result.changes;
	},

	/**
	 * Deletes specific memories by their IDs and invalidates cache.
	 */
	deleteMemoriesByIds(ids: number[], chatId?: string): void {
		if (ids.length === 0) return;
		const deleteMany = db.transaction((memoryIds: number[]) => {
			for (const id of memoryIds) {
				stmts.deleteMemoryById.run(id);
			}
		});
		deleteMany(ids);
		if (chatId) {
			memoryCache.delete(chatId);
		} else {
			memoryCache.clear();
		}
	},

	/**
	 * Updates an existing memory's text and category.
	 */
	updateMemory(
		id: number,
		text: string,
		category?: string,
		embedding?: number[],
		chatId?: string,
	): void {
		if (embedding && embedding.length > 0) {
			const buffer = Buffer.from(new Float32Array(embedding).buffer);
			db.run(
				"UPDATE memories SET memory_text = ?, category = ?, embedding = ? WHERE id = ?",
				[text, category || "PROFILE", buffer, id],
			);
		} else {
			db.run("UPDATE memories SET memory_text = ?, category = ? WHERE id = ?", [
				text,
				category || "PROFILE",
				id,
			]);
		}
		if (chatId) {
			memoryCache.delete(chatId);
		} else {
			memoryCache.clear();
		}
	},

	/**
	 * Clears all memories for a chat and invalidates cache.
	 */
	clearMemories(chatId: string): void {
		stmts.deleteMemories.run(chatId);
		memoryCache.delete(chatId);
	},

	/**
	 * Prunes messages older than maxAgeDays for a specific chat.
	 * Returns the number of deleted messages.
	 */
	pruneOldMessages(chatId: string, maxAgeDays: number = 7): number {
		const cutoff = Math.floor(Date.now() / 1000) - maxAgeDays * 86400;
		const result = stmts.pruneOldMessages.run(chatId, cutoff);
		return result.changes;
	},

	/**
	 * Gets chat statistics (total messages, unique users, top users, today's count).
	 */
	getChatStats(chatId: string): {
		totalMessages: number;
		uniqueUsers: number;
		topUsers: { first_name: string; msg_count: number }[];
		todayMessages: number;
	} {
		const stats = stmts.getChatStats.get(chatId) as {
			total_messages: number;
			unique_users: number;
		} | null;
		const topUsers = stmts.getTopUsers.all(chatId) as {
			first_name: string;
			msg_count: number;
		}[];

		const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
		const todayResult = stmts.getTodayMessageCount.get(chatId, todayStart) as {
			count: number;
		} | null;

		return {
			totalMessages: stats?.total_messages || 0,
			uniqueUsers: stats?.unique_users || 0,
			topUsers: topUsers,
			todayMessages: todayResult?.count || 0,
		};
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
	 * Retrieves all chat IDs where a specific user has interacted.
	 */
	getUserMemberChatIds(userId: number): string[] {
		const rows = stmts.getUserMemberChatIds.all(userId) as {
			chat_id: string;
		}[];
		const set = new Set(rows.map((r) => r.chat_id));
		set.add(userId.toString());
		return Array.from(set);
	},

	/**
	 * Gets memories associated with a specific user in a chat.
	 */
	getUserMemories(chatId: string, userId: number): MemoryItem[] {
		const all = this.getMemories(chatId);
		return all.filter((m) => m.userId === userId);
	},

	/**
	 * Retrieves personal memories/facts saved about a specific user across all chats.
	 */
	getUserAllMemories(userId: number): Array<{
		id: number;
		chat_id: string;
		memory_text: string;
		created_at: number;
		user_id: number | null;
		category: string;
		expires_at: number | null;
	}> {
		return stmts.getUserMemories.all(userId) as Array<{
			id: number;
			chat_id: string;
			memory_text: string;
			created_at: number;
			user_id: number | null;
			category: string;
			expires_at: number | null;
		}>;
	},

	/**
	 * Retrieves summary statistics for a regular user.
	 */
	getUserStats(userId: number): {
		totalMessages: number;
		totalMemories: number;
		totalGroups: number;
	} {
		const res = stmts.getUserStats.get(userId, userId, userId) as {
			total_messages: number;
			total_memories: number;
			total_groups: number;
		} | null;

		return {
			totalMessages: res?.total_messages || 0,
			totalMemories: res?.total_memories || 0,
			totalGroups: res?.total_groups || 0,
		};
	},

	/**
	 * Retrieves all available personas (system presets + custom user-created).
	 */
	getAllPersonas(): PersonaRow[] {
		return stmts.getAllPersonas.all() as PersonaRow[];
	},

	/**
	 * Retrieves a specific persona by its unique ID.
	 */
	getPersonaById(id: string): PersonaRow | null {
		return stmts.getPersonaById.get(id) as PersonaRow | null;
	},

	/**
	 * Creates a new custom persona.
	 */
	createPersona(params: {
		id?: string;
		name: string;
		description?: string | null;
		prompt: string;
		emoji?: string;
		isSystem?: boolean;
		createdBy?: number | null;
	}): PersonaRow {
		const id =
			params.id ||
			`custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
		const now = Math.floor(Date.now() / 1000);
		const isSys = params.isSystem ? 1 : 0;
		const emoji = params.emoji || "🤖";
		const description = params.description || null;
		const createdBy = params.createdBy ?? null;

		stmts.insertPersona.run(
			id,
			params.name.trim(),
			description ? description.trim() : null,
			params.prompt.trim(),
			emoji,
			isSys,
			createdBy,
			now,
			now,
		);

		const created = this.getPersonaById(id);
		if (!created) {
			throw new Error(`Failed to create persona '${id}'`);
		}
		return created;
	},

	/**
	 * Updates an existing custom persona.
	 */
	updatePersona(
		id: string,
		updates: {
			name?: string;
			description?: string | null;
			prompt?: string;
			emoji?: string;
		},
	): PersonaRow | null {
		const existing = this.getPersonaById(id);
		if (!existing) return null;

		const name =
			updates.name !== undefined ? updates.name.trim() : existing.name;
		const description =
			updates.description !== undefined
				? updates.description
					? updates.description.trim()
					: null
				: existing.description;
		const prompt =
			updates.prompt !== undefined ? updates.prompt.trim() : existing.prompt;
		const emoji = updates.emoji !== undefined ? updates.emoji : existing.emoji;
		const now = Math.floor(Date.now() / 1000);

		stmts.updatePersona.run(name, description, prompt, emoji, now, id);
		return this.getPersonaById(id);
	},

	/**
	 * Deletes a custom persona and resets any chats that were actively using it.
	 * System personas (is_system = 1) cannot be deleted.
	 */
	deletePersona(id: string): boolean {
		const persona = this.getPersonaById(id);
		if (!persona || persona.is_system === 1) return false;

		const transaction = db.transaction(() => {
			stmts.clearChatActivePersonaIfMatches.run(id);
			stmts.deletePersona.run(id);
		});

		transaction();
		return true;
	},

	/**
	 * Retrieves the active persona for a specific chat.
	 * Returns null if the chat uses default ket.ai settings.
	 */
	getActivePersonaForChat(chatId: string): PersonaRow | null {
		return stmts.getChatActivePersona.get(chatId) as PersonaRow | null;
	},

	/**
	 * Sets or clears the active persona for a chat.
	 */
	setActivePersonaForChat(chatId: string, personaId: string | null): boolean {
		this.createChat(chatId, "");
		if (personaId) {
			const persona = this.getPersonaById(personaId);
			if (!persona) return false;
			stmts.setChatActivePersona.run(personaId, chatId);
		} else {
			stmts.setChatActivePersona.run(null, chatId);
		}
		return true;
	},
};
