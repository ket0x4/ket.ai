import { db } from "../index";

// Pre-compiled prepared statements for better performance
export const stmts = {
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
	getUser: db.prepare("SELECT * FROM users WHERE user_id = ?"),
	insertUserWithOptOut: db.prepare(
		`INSERT INTO users (user_id, username, first_name, is_opted_out, last_updated) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       username = COALESCE(excluded.username, users.username),
       first_name = COALESCE(excluded.first_name, users.first_name),
       is_opted_out = excluded.is_opted_out,
       last_updated = excluded.last_updated`,
	),
	getOptedOutUsers: db.prepare(
		"SELECT user_id, username FROM users WHERE is_opted_out = 1",
	),

	insertMessage: db.prepare(
		`INSERT INTO messages (chat_id, message_id, user_id, reply_to_message_id, text, photo_file_id, document_file_id, document_file_name, document_mime_type, is_bot_reply, sent_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(chat_id, message_id) DO UPDATE SET
       text = excluded.text,
       photo_file_id = excluded.photo_file_id,
       document_file_id = excluded.document_file_id,
       document_file_name = excluded.document_file_name,
       document_mime_type = excluded.document_mime_type`,
	),

	getRecentMessages: db.prepare(
		`SELECT m.*, u.username, u.first_name 
     FROM (
       SELECT * FROM messages 
       WHERE chat_id = ? 
         AND (user_id = 0 OR user_id NOT IN (SELECT user_id FROM users WHERE is_opted_out = 1))
       ORDER BY sent_at DESC, id DESC LIMIT ?
     ) m
     LEFT JOIN users u ON m.user_id = u.user_id
     ORDER BY m.sent_at ASC, m.id ASC`,
	),
	getMessage: db.prepare(
		"SELECT * FROM messages WHERE chat_id = ? AND message_id = ?",
	),
	getMessageWithUser: db.prepare(
		`SELECT m.*, u.username, u.first_name 
     FROM messages m 
     LEFT JOIN users u ON m.user_id = u.user_id 
     WHERE m.chat_id = ? AND m.message_id = ?`,
	),
	findUserByName: db.prepare(
		`SELECT user_id, username, first_name, last_updated 
     FROM users 
     WHERE LOWER(first_name) = LOWER(?) OR LOWER(username) = LOWER(?) 
     ORDER BY last_updated DESC LIMIT 1`,
	),
	getMessageCount: db.prepare(
		"SELECT COUNT(*) as count FROM messages WHERE chat_id = ?",
	),
	deleteMessages: db.prepare("DELETE FROM messages WHERE chat_id = ?"),
	deleteMessage: db.prepare(
		"DELETE FROM messages WHERE chat_id = ? AND message_id = ?",
	),
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
		`DELETE FROM memories WHERE id = (
			SELECT id FROM memories 
			WHERE chat_id = ? 
			ORDER BY 
				CASE 
					WHEN expires_at IS NOT NULL AND expires_at <= unixepoch() THEN 1
					WHEN category = 'TEMPORARY' THEN 2
					WHEN category = 'DYNAMIC' THEN 3
					ELSE 4
				END ASC,
				created_at ASC 
			LIMIT 1
		)`,
	),
	searchMemoriesFTS: db.prepare(
		`SELECT m.id, m.memory_text, bm25(memories_fts) as rank
     FROM memories_fts fts
     JOIN memories m ON m.id = fts.rowid
     WHERE memories_fts MATCH ? AND m.chat_id = ?
     ORDER BY rank ASC
     LIMIT ?`,
	),
	pruneExpiredMemories: db.prepare(
		"DELETE FROM memories WHERE chat_id = ? AND expires_at IS NOT NULL AND expires_at <= ? RETURNING id",
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
	updateMemoryWithEmbedding: db.prepare(
		"UPDATE memories SET memory_text = ?, category = ?, embedding = ? WHERE id = ?",
	),
	updateMemoryWithoutEmbedding: db.prepare(
		"UPDATE memories SET memory_text = ?, category = ? WHERE id = ?",
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
