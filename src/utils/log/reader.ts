import fs from "node:fs";
import path from "node:path";
import { parseLogLine } from "./format";
import type { LogEntry, ReadLogsOptions } from "./types";

const DEFAULT_LIMIT = 150;
const MAX_LIMIT = 500;

/**
 * Reads a log file newest-last, grouping continuation lines (for example stack
 * traces) into the entry that started them, then filters and limits the result.
 */
export function readLogs(options: ReadLogsOptions): LogEntry[] {
	const filePath = path.join(options.logDir, `${options.type}.log`);
	if (!fs.existsSync(filePath)) return [];

	const lines = fs.readFileSync(filePath, "utf-8").split("\n");
	const entries: LogEntry[] = [];

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index].trimEnd();
		if (!line) continue;

		const parsed = parseLogLine(line);
		if (parsed) {
			entries.push({ id: index, ...parsed, raw: line });
			continue;
		}

		const previous = entries[entries.length - 1];
		if (previous) {
			previous.message += `\n${line}`;
			previous.raw += `\n${line}`;
		}
	}

	const level = options.level?.toUpperCase();
	const search = options.search?.trim().toLowerCase() || "";
	const filtered = entries.filter((entry) => {
		if (level && level !== "ALL" && entry.level !== level) return false;
		if (search && !entry.raw.toLowerCase().includes(search)) return false;
		return true;
	});

	const limit = Math.min(
		MAX_LIMIT,
		Math.max(1, options.limit ?? DEFAULT_LIMIT),
	);
	return filtered.slice(-limit);
}
