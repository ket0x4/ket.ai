import type { Database } from "bun:sqlite";
import logger from "../../utils/logger";
import { migration001 } from "./001-initial";
import { migration002 } from "./002-memory-content";
import type { Migration } from "./types";

const migrations: Migration[] = [migration001, migration002];

/**
 * Applies pending schema migrations in order. Each migration and its version
 * record are committed atomically.
 */
export function runMigrations(db: Database): void {
	db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    ) STRICT;
  `);

	const applied = new Set(
		(
			db.prepare("SELECT version FROM schema_migrations").all() as Array<{
				version: number;
			}>
		).map((row) => row.version),
	);

	for (const migration of migrations) {
		if (applied.has(migration.version)) continue;

		logger.info(
			`[DB] Applying migration ${migration.version}: ${migration.name}`,
		);

		const apply = db.transaction(() => {
			migration.up(db);
			db.prepare(
				"INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
			).run(migration.version, migration.name, Math.floor(Date.now() / 1000));
		});
		apply();
	}
}
