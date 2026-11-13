import type { Database } from "bun:sqlite";

export interface Migration {
	version: number;
	name: string;
	up: (db: Database) => void;
}
