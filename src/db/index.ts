import { Database } from "bun:sqlite";
import { dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { CONFIG } from "../config/index";
import logger from "../utils/logger";

// Ensure database directory exists with local fallback if root path is not writable (e.g. /app in Docker vs local macOS)
let dbPath = CONFIG.DB_PATH;
const dbDir = dirname(dbPath);
if (dbDir && dbDir !== "." && !existsSync(dbDir)) {
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    logger.warn(`[DB] Could not create database directory at "${dbDir}". Falling back to "./data/bot.db"`);
    dbPath = "./data/bot.db";
    const fallbackDir = dirname(dbPath);
    if (fallbackDir && !existsSync(fallbackDir)) {
      mkdirSync(fallbackDir, { recursive: true });
    }
  }
}

// Initialize the database and ensure schema is ready
export const db = new Database(dbPath, { create: true });
db.run("PRAGMA journal_mode=WAL");
db.run("PRAGMA synchronous=NORMAL");
db.run("PRAGMA temp_store=MEMORY");
db.run("PRAGMA busy_timeout=5000");
db.run("PRAGMA foreign_keys=ON");

// Run migrations (create tables)
export function runMigrations() {
  logger.info("Running database migrations (Strict Mode)...");

  // Table: users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_updated INTEGER NOT NULL
    ) STRICT;
  `);

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
    ) STRICT;
  `);

  // Table: messages
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reply_to_message_id INTEGER,
      text TEXT,
      photo_file_id TEXT,
      is_bot_reply INTEGER DEFAULT 0,
      sent_at INTEGER NOT NULL,
      FOREIGN KEY(chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(user_id),
      UNIQUE(chat_id, message_id)
    ) STRICT;
  `);

  // Indexes for faster lookups on message history
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id_sent_at_id
    ON messages(chat_id, sent_at DESC, id DESC);
  `);

  // Table: memories
  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      memory_text TEXT NOT NULL,
      embedding BLOB,
      created_at INTEGER NOT NULL,
      user_id INTEGER,
      category TEXT DEFAULT 'PROFILE',
      expires_at INTEGER,
      FOREIGN KEY(chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
    ) STRICT;
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

// Execute migrations synchronously before any module prepares statements
runMigrations();
