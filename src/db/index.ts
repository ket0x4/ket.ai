import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG } from "../config/index";
import logger from "../utils/logger";

// Ensure database directory exists with local fallback if root path is not writable (e.g. /app in Docker vs local macOS)
let dbPath = CONFIG.DB_PATH;
const dbDir = dirname(dbPath);
if (dbDir && dbDir !== "." && !existsSync(dbDir)) {
	try {
		mkdirSync(dbDir, { recursive: true });
	} catch {
		logger.warn(
			`[DB] Could not create database directory at "${dbDir}". Falling back to "./data/bot.db"`,
		);
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
function runMigrations() {
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
      active_persona_id TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL
    ) STRICT;
  `);

	// Ensure active_persona_id column exists for existing databases
	try {
		const chatColumns = db.prepare("PRAGMA table_info(chats)").all() as Array<{
			name: string;
		}>;
		const hasActivePersona = chatColumns.some(
			(col) => col.name === "active_persona_id",
		);
		if (!hasActivePersona) {
			db.run(
				"ALTER TABLE chats ADD COLUMN active_persona_id TEXT DEFAULT NULL",
			);
		}
	} catch (e) {
		logger.debug("[DB Migration] active_persona_id check/alter skipped:", e);
	}

	// Clean legacy placeholder titles so real Telegram titles can be dynamically resolved
	try {
		db.run(
			"UPDATE chats SET title = NULL WHERE title IN ('Whitelisted Chat', 'Seeded Group', '')",
		);
	} catch (e) {
		logger.debug("[DB Migration] chat title cleanup skipped:", e);
	}

	// Check if personas table has legacy schema (e.g. id INTEGER PRIMARY KEY)
	try {
		const personasTable = db
			.prepare(
				"SELECT sql FROM sqlite_master WHERE type='table' AND name='personas'",
			)
			.get() as { sql: string } | null;

		if (personasTable?.sql?.includes("id INTEGER PRIMARY KEY")) {
			logger.info(
				"[DB Migration] Migrating legacy personas table to id TEXT schema...",
			);
			db.run("DROP TABLE IF EXISTS personas");
		}
	} catch (e) {
		logger.debug("[DB Migration] personas schema migration check:", e);
	}

	// Table: personas
	db.run(`
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      emoji TEXT DEFAULT '',
      is_system INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
  `);

	db.run(`
    CREATE INDEX IF NOT EXISTS idx_personas_created_by
    ON personas(created_by);
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
      document_file_id TEXT,
      document_file_name TEXT,
      document_mime_type TEXT,
      is_bot_reply INTEGER DEFAULT 0,
      sent_at INTEGER NOT NULL,
      FOREIGN KEY(chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(user_id),
      UNIQUE(chat_id, message_id)
    ) STRICT;
  `);

	// Ensure document columns exist for existing databases
	try {
		const msgColumns = db
			.prepare("PRAGMA table_info(messages)")
			.all() as Array<{ name: string }>;
		if (!msgColumns.some((col) => col.name === "document_file_id")) {
			db.run(
				"ALTER TABLE messages ADD COLUMN document_file_id TEXT DEFAULT NULL",
			);
		}
		if (!msgColumns.some((col) => col.name === "document_file_name")) {
			db.run(
				"ALTER TABLE messages ADD COLUMN document_file_name TEXT DEFAULT NULL",
			);
		}
		if (!msgColumns.some((col) => col.name === "document_mime_type")) {
			db.run(
				"ALTER TABLE messages ADD COLUMN document_mime_type TEXT DEFAULT NULL",
			);
		}
	} catch (e) {
		logger.debug(
			"[DB Migration] messages document columns check/alter skipped:",
			e,
		);
	}

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

	db.run(`
    CREATE INDEX IF NOT EXISTS idx_memories_chat_created
    ON memories(chat_id, created_at ASC);
  `);

	db.run(`
    CREATE INDEX IF NOT EXISTS idx_memories_user_created
    ON memories(user_id, created_at DESC);
  `);

	// FTS5 Full-Text Search Virtual Table for fast lexical keyword searches
	try {
		db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        memory_text,
        content='memories',
        content_rowid='id',
        tokenize='unicode61'
      );
    `);

		// Triggers to keep FTS index perfectly synced with memories table
		db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, memory_text) VALUES (new.id, new.memory_text);
      END;
    `);

		db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, memory_text) VALUES('delete', old.id, old.memory_text);
      END;
    `);

		db.run(`
      CREATE TRIGGER IF NOT EXISTS trg_memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, memory_text) VALUES('delete', old.id, old.memory_text);
        INSERT INTO memories_fts(rowid, memory_text) VALUES (new.id, new.memory_text);
      END;
    `);

		// Rebuild FTS index on startup if needed to ensure parity
		const ftsCount = db
			.prepare("SELECT COUNT(*) as count FROM memories_fts")
			.get() as { count: number } | null;
		const memCount = db
			.prepare("SELECT COUNT(*) as count FROM memories")
			.get() as { count: number } | null;

		if ((ftsCount?.count || 0) < (memCount?.count || 0)) {
			logger.info("[DB Migration] Rebuilding memories_fts search index...");
			db.run("INSERT INTO memories_fts(memories_fts) VALUES('rebuild')");
		}
	} catch (e) {
		logger.warn("[DB Migration] Failed to initialize memories_fts:", e);
	}

	seedDefaultPersonas();
}

function seedDefaultPersonas() {
	const now = Math.floor(Date.now() / 1000);

	try {
		db.run("DELETE FROM personas WHERE is_system = 1 AND id != 'ket-default'");
		db.run(
			"UPDATE chats SET active_persona_id = NULL WHERE active_persona_id IS NOT NULL AND active_persona_id NOT IN (SELECT id FROM personas)",
		);
	} catch (e) {
		logger.debug("[DB Seed] Clean legacy system personas skipped:", e);
	}

	const insertStmt = db.prepare(`
    INSERT INTO personas (id, name, description, prompt, emoji, is_system, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      prompt = excluded.prompt,
      emoji = excluded.emoji
  `);

	try {
		insertStmt.run(
			"ket-default",
			"ket.ai Standard",
			"Default smart, witty, and balanced ket.ai conversation style.",
			"Be a friendly, smart, witty, and natural conversation partner. Use fluent, modern, and natural language, avoiding robotic or artificial phrases. Never use emojis in your responses.",
			"",
			now,
			now,
		);
	} catch (err) {
		logger.error("[DB Seed] Failed to seed default persona:", err);
	}
}

// Execute migrations synchronously before any module prepares statements
runMigrations();
