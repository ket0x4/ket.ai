import { Database } from "bun:sqlite";
import { CONFIG } from "../config/index";
import logger from "../utils/logger";

// Initialize the database and ensure schema is ready
export const db = new Database(CONFIG.DB_PATH, { create: true });

// Run migrations immediately on DB instantiation
runMigrations();

// Run migrations (create tables)
export function runMigrations() {
  logger.info("Running database migrations...");

  // Table: chats
  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      chat_id TEXT PRIMARY KEY,
      title TEXT,
      reply_probability REAL DEFAULT 0.05,
      last_random_reply_at INTEGER DEFAULT 0,
      current_topic TEXT DEFAULT NULL,
      is_allowed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // Table: messages
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      username TEXT,
      first_name TEXT,
      reply_to_first_name TEXT DEFAULT NULL,
      text TEXT,
      photo_file_id TEXT,
      is_bot_reply INTEGER DEFAULT 0,
      sent_at INTEGER NOT NULL,
      FOREIGN KEY(chat_id) REFERENCES chats(chat_id)
    );
  `);

  // Indexes for faster lookups on message history
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id_sent_at
    ON messages(chat_id, sent_at);
  `);

  // Table: memories
  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      memory_text TEXT NOT NULL,
      embedding TEXT,
      created_at INTEGER NOT NULL,
      user_id INTEGER DEFAULT NULL,
      category TEXT DEFAULT 'PROFILE',
      expires_at INTEGER DEFAULT NULL,
      FOREIGN KEY(chat_id) REFERENCES chats(chat_id)
    );
  `);

  // Index for faster lookups on memories
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_memories_chat_id
    ON memories(chat_id);
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_memories_chat_user
    ON memories(chat_id, user_id);
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_memories_chat_expires
    ON memories(chat_id, expires_at);
  `);
}
