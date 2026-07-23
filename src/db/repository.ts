import { db } from "./index";
import logger from "../utils/logger";
import { CONFIG } from "../config/index";

export interface ChatRow {
  chat_id: string;
  title: string | null;
  reply_probability: number;
  last_random_reply_at: number;
  current_topic: string | null;
  is_allowed: number; // 0 or 1
  created_at: number;
}

export interface MessageRow {
  id: number;
  chat_id: string;
  message_id: number;
  user_id: number;
  username: string | null;
  first_name: string | null;
  reply_to_first_name: string | null;
  text: string | null;
  photo_file_id: string | null;
  is_bot_reply: number; // 0 or 1
  sent_at: number;
}

// Pre-compiled prepared statements for better performance
const stmts = {
  getChat: db.prepare("SELECT * FROM chats WHERE chat_id = ?"),
  insertChat: db.prepare(
    `INSERT INTO chats (chat_id, title, reply_probability, is_allowed, created_at) VALUES (?, ?, ?, ?, ?)`
  ),
  setChatAllowed: db.prepare("UPDATE chats SET is_allowed = ? WHERE chat_id = ?"),
  insertMessage: db.prepare(
    `INSERT INTO messages (chat_id, message_id, user_id, username, first_name, reply_to_first_name, text, photo_file_id, is_bot_reply, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  getRecentMessages: db.prepare(
    `SELECT * FROM (SELECT * FROM messages WHERE chat_id = ? ORDER BY sent_at DESC, id DESC LIMIT ?) ORDER BY sent_at ASC, id ASC`
  ),
  getMessageCount: db.prepare("SELECT COUNT(*) as count FROM messages WHERE chat_id = ?"),
  deleteMessages: db.prepare("DELETE FROM messages WHERE chat_id = ?"),
  deleteMemories: db.prepare("DELETE FROM memories WHERE chat_id = ?"),
  resetTopic: db.prepare("UPDATE chats SET current_topic = NULL WHERE chat_id = ?"),
  insertMemory: db.prepare("INSERT INTO memories (chat_id, memory_text, embedding, created_at) VALUES (?, ?, ?, ?)"),
  getMemories: db.prepare("SELECT id, memory_text, embedding FROM memories WHERE chat_id = ? ORDER BY created_at ASC"),
  deleteMemoryById: db.prepare("DELETE FROM memories WHERE id = ?"),
  getMemoryCount: db.prepare("SELECT COUNT(*) as count FROM memories WHERE chat_id = ?"),
  deleteOldestMemory: db.prepare(
    `DELETE FROM memories WHERE id = (SELECT id FROM memories WHERE chat_id = ? ORDER BY created_at ASC LIMIT 1)`
  ),
  pruneOldMessages: db.prepare("DELETE FROM messages WHERE chat_id = ? AND sent_at < ?"),
  getChatStats: db.prepare(
    `SELECT COUNT(*) as total_messages, COUNT(DISTINCT user_id) as unique_users FROM messages WHERE chat_id = ?`
  ),
  getTopUsers: db.prepare(
    `SELECT first_name, COUNT(*) as msg_count FROM messages WHERE chat_id = ? AND is_bot_reply = 0 GROUP BY user_id ORDER BY msg_count DESC LIMIT 5`
  ),
  getTodayMessageCount: db.prepare(
    `SELECT COUNT(*) as count FROM messages WHERE chat_id = ? AND sent_at >= ?`
  ),
};

export const Repository = {
  /**
   * Retrieves a chat configuration by its chat ID.
   */
  getChat(chatId: string): ChatRow | null {
    return stmts.getChat.get(chatId) as ChatRow | null;
  },

  /**
   * Creates a new chat entry if it doesn't already exist.
   */
  createChat(chatId: string, title: string = "", isAllowed: boolean = false): ChatRow {
    const existing = this.getChat(chatId);
    if (existing) return existing;

    const now = Math.floor(Date.now() / 1000);
    const isAllowedInt = isAllowed ? 1 : 0;
    const defaultProb = CONFIG.DEFAULT_REPLY_PROBABILITY;

    stmts.insertChat.run(chatId, title, defaultProb, isAllowedInt, now);
    return this.getChat(chatId)!;
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
    }
  ): void {
    const updates: string[] = [];
    const params: any[] = [];

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
    db.run(
      `UPDATE chats SET ${updates.join(", ")} WHERE chat_id = ?`,
      params
    );
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
    replyToFirstName?: string;
    text?: string;
    photoFileId?: string;
    isBotReply?: boolean;
    sentAt: number;
  }): void {
    stmts.insertMessage.run(
      params.chatId,
      params.messageId,
      params.userId,
      params.username || null,
      params.firstName || null,
      params.replyToFirstName || null,
      params.text || null,
      params.photoFileId || null,
      params.isBotReply ? 1 : 0,
      params.sentAt
    );
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
    const result = stmts.getMessageCount.get(chatId) as { count: number } | null;
    return result ? result.count : 0;
  },

  /**
   * Clears chat history and long-term memories for a group (e.g. on reset).
   */
  clearChatHistory(chatId: string): void {
    stmts.deleteMessages.run(chatId);
    stmts.deleteMemories.run(chatId);
    stmts.resetTopic.run(chatId);
  },

  /**
   * Adds a new memory fact for a chat.
   * Enforces a maximum of 2000 memories per chat — oldest is removed when limit is reached.
   */
  addMemory(chatId: string, memoryText: string, embedding: number[]): void {
    const countResult = stmts.getMemoryCount.get(chatId) as { count: number } | null;
    const count = countResult ? countResult.count : 0;
    if (count >= 2000) {
      stmts.deleteOldestMemory.run(chatId);
      logger.info(`[Memory] Max memory limit (2000) reached for chat ${chatId}. Oldest memory removed.`);
    }

    const now = Math.floor(Date.now() / 1000);
    stmts.insertMemory.run(chatId, memoryText, JSON.stringify(embedding), now);
  },

  /**
   * Retrieves all memory facts for a chat with their embeddings.
   */
  getMemories(chatId: string): { id: number; text: string; embedding: number[] }[] {
    const rows = stmts.getMemories.all(chatId) as { id: number; memory_text: string; embedding: string | null }[];
    return rows.map((row) => ({
      id: row.id,
      text: row.memory_text,
      embedding: row.embedding ? JSON.parse(row.embedding) : []
    }));
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
  },

  /**
   * Clears all memories for a chat.
   */
  clearMemories(chatId: string): void {
    stmts.deleteMemories.run(chatId);
  },

  /**
   * Prunes messages older than maxAgeDays for a specific chat.
   * Returns the number of deleted messages.
   */
  pruneOldMessages(chatId: string, maxAgeDays: number = 7): number {
    const cutoff = Math.floor(Date.now() / 1000) - (maxAgeDays * 86400);
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
    const stats = stmts.getChatStats.get(chatId) as { total_messages: number; unique_users: number } | null;
    const topUsers = stmts.getTopUsers.all(chatId) as { first_name: string; msg_count: number }[];

    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayResult = stmts.getTodayMessageCount.get(chatId, todayStart) as { count: number } | null;

    return {
      totalMessages: stats?.total_messages || 0,
      uniqueUsers: stats?.unique_users || 0,
      topUsers: topUsers,
      todayMessages: todayResult?.count || 0,
    };
  },
};
export type Repository = typeof Repository;
