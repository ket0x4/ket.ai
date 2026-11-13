import logger from "../../utils/logger";
import type { Migration } from "./types";

/**
 * Rebuilds memories with a clean column set, constraints, and FTS index:
 * - memory_text -> content
 * - updated_at added
 * - category constrained to the three supported values
 * - expires_at validated against created_at
 * - redundant standalone chat_id index removed
 */
export const migration002: Migration = {
	version: 2,
	name: "memory-content-schema",
	up(db) {
		const columns = db.prepare("PRAGMA table_info(memories)").all() as Array<{
			name: string;
		}>;
		if (columns.some((column) => column.name === "content")) {
			logger.info("[DB Migration] Memory content schema already present.");
			return;
		}

		const before = db
			.prepare("SELECT COUNT(*) as count FROM memories")
			.get() as { count: number } | null;

		db.run("DROP TRIGGER IF EXISTS trg_memories_ai");
		db.run("DROP TRIGGER IF EXISTS trg_memories_ad");
		db.run("DROP TRIGGER IF EXISTS trg_memories_au");
		db.run("DROP TABLE IF EXISTS memories_fts");

		db.run(`
      CREATE TABLE memories_new (
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
      INSERT INTO memories_new (
        id, chat_id, content, embedding, created_at, updated_at,
        user_id, category, expires_at
      )
      SELECT
        id,
        chat_id,
        memory_text,
        embedding,
        created_at,
        created_at,
        user_id,
        CASE
          WHEN category IN ('PROFILE', 'DYNAMIC', 'TEMPORARY') THEN category
          ELSE 'PROFILE'
        END,
        CASE
          WHEN expires_at IS NOT NULL AND expires_at < created_at THEN created_at
          ELSE expires_at
        END
      FROM memories;
    `);

		db.run("DROP TABLE memories");
		db.run("ALTER TABLE memories_new RENAME TO memories");

		db.run(`
      CREATE INDEX idx_memories_chat_created
      ON memories(chat_id, created_at ASC);
    `);
		db.run(`
      CREATE INDEX idx_memories_chat_user
      ON memories(chat_id, user_id);
    `);
		db.run(`
      CREATE INDEX idx_memories_chat_expires
      ON memories(chat_id, expires_at);
    `);
		db.run(`
      CREATE INDEX idx_memories_user_created
      ON memories(user_id, created_at DESC);
    `);

		db.run(`
      CREATE VIRTUAL TABLE memories_fts USING fts5(
        content,
        content='memories',
        content_rowid='id',
        tokenize='unicode61'
      );
    `);
		db.run(`
      CREATE TRIGGER trg_memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
      END;
    `);
		db.run(`
      CREATE TRIGGER trg_memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
      END;
    `);
		db.run(`
      CREATE TRIGGER trg_memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
        INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
      END;
    `);
		db.run("INSERT INTO memories_fts(memories_fts) VALUES('rebuild')");

		logger.info(
			`[DB Migration] Rebuilt memories table (${before?.count || 0} rows).`,
		);
	},
};
