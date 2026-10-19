import fs from "node:fs";
import path from "node:path";
import type { AuthContext } from "../../../web/src/types";
import { CONFIG } from "../../config/index";
import logger from "../../utils/logger";
import { ToolTraceLogger } from "../../utils/toolTrace";
import { errorResponse, jsonResponse } from "../http";

const LOG_LINE_REGEX =
	/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3})\s+\[([A-Z]+)\s*\]\s+(.*)$/;

interface ParsedLogLine {
	id: number;
	timestamp: string;
	level: string;
	message: string;
	raw: string;
}

function parseLogLine(line: string, id: number): ParsedLogLine {
	const match = line.match(LOG_LINE_REGEX);
	if (!match) {
		return { id, timestamp: "", level: "INFO", message: line, raw: line };
	}
	return {
		id,
		timestamp: match[1],
		level: match[2],
		message: match[3],
		raw: line,
	};
}

function collectRecentLogs(
	lines: string[],
	limit: number,
	levelFilter: string | undefined,
	searchFilter: string,
): ParsedLogLine[] {
	const hasLevel = Boolean(levelFilter && levelFilter !== "ALL");
	const results: ParsedLogLine[] = [];

	for (let i = lines.length - 1; i >= 0 && results.length < limit; i--) {
		const line = lines[i]?.trim();
		if (!line) continue;
		if (searchFilter && !line.toLowerCase().includes(searchFilter)) continue;

		const parsed = parseLogLine(line, i);
		if (hasLevel && parsed.level !== levelFilter) continue;
		results.push(parsed);
	}

	return results.reverse();
}

function handleLogsGet(url: URL, auth: AuthContext): Response {
	if (!auth.isOwner) {
		return errorResponse(
			"Forbidden: Only bot owner can access server logs",
			403,
		);
	}

	try {
		const logType =
			url.searchParams.get("type") === "error" ? "error.log" : "app.log";
		const levelFilter = url.searchParams.get("level")?.toUpperCase();
		const searchFilter = url.searchParams.get("search")?.toLowerCase() || "";
		const rawLimit = Number.parseInt(
			url.searchParams.get("limit") || "150",
			10,
		);
		const limit = Number.isNaN(rawLimit)
			? 150
			: Math.min(500, Math.max(1, rawLimit));

		const logFilePath = path.join(process.cwd(), CONFIG.LOG_DIR, logType);
		if (!fs.existsSync(logFilePath)) {
			return jsonResponse({ logs: [] });
		}

		const lines = fs.readFileSync(logFilePath, "utf-8").split("\n");
		return jsonResponse({
			logs: collectRecentLogs(lines, limit, levelFilter, searchFilter),
		});
	} catch (e) {
		logger.error("[Server] Error reading log file:", e);
		return errorResponse("Failed to read logs", 500);
	}
}

export function handleAdminAndToolsRoutes(
	pathname: string,
	req: Request,
	url: URL,
	auth: AuthContext,
): Promise<Response> | Response | null {
	if (pathname === "/api/tool-traces" && req.method === "GET") {
		if (!auth.isOwner) {
			return errorResponse(
				"Forbidden: Only bot owner can view tool traces",
				403,
			);
		}
		return jsonResponse({ traces: ToolTraceLogger.getAll() });
	}
	if (pathname === "/api/logs" && req.method === "GET") {
		return handleLogsGet(url, auth);
	}
	return null;
}
