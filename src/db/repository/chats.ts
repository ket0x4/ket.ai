import { CONFIG } from "../../config/index";
import logger from "../../utils/logger";
import { db } from "../index";
import { invalidateMemoryCaches } from "./cache";
import { invalidatePersonaCaches } from "./personas";
import { stmts } from "./statements";
import type { ChatRow, RepositorySelf } from "./types";

export const chatMethods = {
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
					stmts.insertChat.run(id, "", defaultProb, 1, now);
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
		invalidateMemoryCaches();
		invalidatePersonaCaches();
	},

	/**
	 * Retrieves a chat configuration by its chat ID.
	 */
	getChat(chatId: string): ChatRow | null {
		return stmts.getChat.get(chatId) as ChatRow | null;
	},

	/**
	 * Creates or updates a chat entry.
	 */
	upsertChat(
		this: RepositorySelf,
		chatId: string,
		title: string = "",
		isAllowed?: boolean,
	): ChatRow {
		const existing = this.getChat(chatId);
		const now = Math.floor(Date.now() / 1000);
		const defaultProb = CONFIG.DEFAULT_REPLY_PROBABILITY;

		if (!existing) {
			const isAllowedInt = isAllowed ? 1 : 0;
			stmts.insertChat.run(chatId, title, defaultProb, isAllowedInt, now);
		} else if (title && title !== existing.title) {
			this.updateChatSettings(chatId, { title });
		}

		if (
			isAllowed !== undefined &&
			existing &&
			existing.is_allowed !== (isAllowed ? 1 : 0)
		) {
			this.setChatAllowed(chatId, isAllowed);
		}

		const updated = this.getChat(chatId);
		if (!updated) {
			throw new Error(`Failed to retrieve chat ${chatId} after upsert`);
		}
		return updated;
	},

	/**
	 * Creates a new chat entry if it doesn't already exist.
	 * If the chat already exists, it preserves existing permissions and settings.
	 */
	createChat(
		this: RepositorySelf,
		chatId: string,
		title: string = "",
		isAllowed: boolean = false,
	): ChatRow {
		const existing = this.getChat(chatId);
		if (existing) {
			if (title && title !== existing.title) {
				this.updateChatSettings(chatId, { title });
			}
			return this.getChat(chatId) || existing;
		}
		return this.upsertChat(chatId, title, isAllowed);
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
			spontaneous_enabled?: boolean | number;
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
		if (settings.spontaneous_enabled !== undefined) {
			updates.push("spontaneous_enabled = ?");
			params.push(settings.spontaneous_enabled ? 1 : 0);
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
};
