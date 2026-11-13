import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG } from "../config/index";
import logger from "../utils/logger";
import { createSchema } from "./schema";
import { seedDefaultPersonas } from "./seed";

// Ensure the database directory exists. Fall back to a local data directory
// when the configured root is not writable (e.g. a read-only container mount).
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

export const db = new Database(dbPath, { create: true });
db.run("PRAGMA journal_mode=WAL");
db.run("PRAGMA synchronous=NORMAL");
db.run("PRAGMA temp_store=MEMORY");
db.run("PRAGMA busy_timeout=5000");
db.run("PRAGMA foreign_keys=ON");

createSchema(db);
seedDefaultPersonas(db);
