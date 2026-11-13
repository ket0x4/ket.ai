import type { AuthContext } from "../../../web/src/types";
import { CONFIG } from "../../config/index";
import { readLogs } from "../../utils/log/reader";
import logger from "../../utils/logger";
import { ToolTraceLogger } from "../../utils/toolTrace";
import { errorResponse, jsonResponse } from "../http";

function handleLogsGet(url: URL, auth: AuthContext): Response {
	if (!auth.isOwner) {
		return errorResponse(
			"Forbidden: Only bot owner can access server logs",
			403,
		);
	}

	try {
		const type = url.searchParams.get("type") === "error" ? "error" : "app";
		const level = url.searchParams.get("level")?.toUpperCase();
		const search = url.searchParams.get("search") || "";
		const rawLimit = Number.parseInt(url.searchParams.get("limit") || "", 10);

		return jsonResponse({
			logs: readLogs({
				logDir: CONFIG.LOG_DIR,
				type,
				level,
				search,
				limit: Number.isNaN(rawLimit) ? undefined : rawLimit,
			}),
		});
	} catch (error) {
		logger.error("[Server] Error reading log file:", error);
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
