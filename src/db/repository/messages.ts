import logger from "../../utils/logger";
import { db } from "../index";
import { invalidateMemoryCaches } from "./cache";
import { stmts } from "./statements";
import type { MessageRow, RepositorySelf } from "./types";

export const messageMethods = {
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
		documentFileId?: string;
		documentFileName?: string;
		documentMimeType?: string;
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
				params.documentFileId || null,
				params.documentFileName || null,
				params.documentMimeType || null,
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
	getRecentMessages(
		this: RepositorySelf,
		chatId: string,
		limit: number = 15,
	): MessageRow[] {
		const rows = stmts.getRecentMessages.all(chatId, limit) as MessageRow[];
		return rows.filter((r) => !r.user_id || !this.isUserOptedOut(r.user_id));
	},

	/**
	 * Retrieves a single message by chatId and messageId.
	 */
	getMessage(chatId: string, messageId: number): MessageRow | null {
		return (stmts.getMessage.get(chatId, messageId) as MessageRow) || null;
	},

	/**
	 * Retrieves a single message with joined user details (username, first_name).
	 */
	getMessageWithUser(chatId: string, messageId: number): MessageRow | null {
		return (
			(stmts.getMessageWithUser.get(chatId, messageId) as MessageRow) || null
		);
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
	 * Deletes a single message from chat history by chat_id and message_id.
	 */
	deleteMessage(chatId: string, messageId: number): boolean {
		try {
			const info = stmts.deleteMessage.run(chatId, messageId);
			return info.changes > 0;
		} catch (e) {
			logger.error(
				`[DB] Error deleting message ${messageId} in chat ${chatId}:`,
				e,
			);
			return false;
		}
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
		invalidateMemoryCaches();
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
};
