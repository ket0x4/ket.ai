import type { Database } from "bun:sqlite";
import logger from "../utils/logger";
import { DEFAULT_PERSONA_ID, DEFAULT_PERSONA_SEED } from "./personaDefaults";

export function seedDefaultPersonas(db: Database): void {
	const now = Math.floor(Date.now() / 1000);

	try {
		db.run("DELETE FROM personas WHERE is_system = 1 AND id != ?", [
			DEFAULT_PERSONA_ID,
		]);
		db.run(
			"UPDATE chats SET active_persona_id = NULL WHERE active_persona_id IS NOT NULL AND (active_persona_id = ? OR active_persona_id NOT IN (SELECT id FROM personas))",
			[DEFAULT_PERSONA_ID],
		);
	} catch (e) {
		logger.debug("[DB Seed] Clean legacy system personas skipped:", e);
	}

	const insertStmt = db.prepare(`
    INSERT INTO personas (id, name, description, prompt, is_system, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      prompt = excluded.prompt
  `);

	try {
		insertStmt.run(
			DEFAULT_PERSONA_SEED.id,
			DEFAULT_PERSONA_SEED.name,
			DEFAULT_PERSONA_SEED.description,
			DEFAULT_PERSONA_SEED.prompt,
			now,
			now,
		);
	} catch (err) {
		logger.error("[DB Seed] Failed to seed default persona:", err);
	}
}
