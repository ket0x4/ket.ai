import type { Database } from "bun:sqlite";

/**
 * Creates the current schema. Idempotent: safe to run on every startup.
 * There is no migration history; databases from older schemas must be
 * recreated or migrated manually.
 */
export function createSchema(db: Database): void {
	db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      is_opted_out INTEGER DEFAULT 0,
      last_updated INTEGER NOT NULL
    ) STRICT;
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      chat_id TEXT PRIMARY KEY,
      title TEXT,
      reply_probability REAL DEFAULT 0.05,
      spontaneous_enabled INTEGER DEFAULT 1,
      last_random_reply_at INTEGER DEFAULT 0,
      current_topic TEXT DEFAULT NULL,
      is_allowed INTEGER DEFAULT 0,
      active_persona_id TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL
    ) STRICT;
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
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

	db.run(`
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id_sent_at_id
    ON messages(chat_id, sent_at DESC, id DESC);
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      user_id INTEGER,
      category TEXT NOT NULL DEFAULT 'PROFILE'
        CHECK (category IN ('PROFILE', 'DYNAMIC', 'TEMPORARY')),
      expires_at INTEGER,
      CHECK (expires_at IS NULL OR expires_at >= created_at),
      FOREIGN KEY(chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE
    ) STRICT;
  `);

	db.run(`
    CREATE INDEX IF NOT EXISTS idx_memories_chat_created
    ON memories(chat_id, created_at ASC);
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
    CREATE INDEX IF NOT EXISTS idx_memories_user_created
    ON memories(user_id, created_at DESC);
  `);

	db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      content,
      content='memories',
      content_rowid='id',
      tokenize='unicode61'
    );
  `);

	db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;
  `);
	db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
    END;
  `);
	db.run(`
    CREATE TRIGGER IF NOT EXISTS trg_memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
    END;
  `);
}
