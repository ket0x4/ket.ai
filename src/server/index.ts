import type { AuthContext } from "../../web/src/types";
import { CONFIG } from "../config/index";
import logger from "../utils/logger";
import { getAuthContext } from "./auth";
import { handleAdminAndToolsRoutes } from "./handlers/admin";
import { handleChatRoutes } from "./handlers/chats";
import { handleMemoryRoutes } from "./handlers/memories";
import { handlePersonaRoutes } from "./handlers/personas";
import { handleSettings } from "./handlers/stats";
import { handleAuthAndStatsRoutes, handleUserOptOut } from "./handlers/user";
import { errorResponse } from "./http";
import { serveStaticFile } from "./static";

async function handleApiRequest(
	req: Request,
	url: URL,
	auth: AuthContext,
): Promise<Response> {
	const pathname = url.pathname;

	const authOrStats = handleAuthAndStatsRoutes(pathname, req, auth);
	if (authOrStats) return authOrStats;

	if (pathname === "/api/user/opt-out") {
		return handleUserOptOut(req, auth);
	}

	if (pathname === "/api/settings") {
		return handleSettings(req, auth);
	}

	const memoryRes = handleMemoryRoutes(pathname, req, url, auth);
	if (memoryRes) return memoryRes;

	const personaRes = handlePersonaRoutes(pathname, req, auth);
	if (personaRes) return personaRes;

	const chatRes = handleChatRoutes(pathname, req, auth);
	if (chatRes) return chatRes;

	const adminRes = handleAdminAndToolsRoutes(pathname, req, url, auth);
	if (adminRes) return adminRes;

	return errorResponse("Endpoint not found", 404);
}

let serverInstance: ReturnType<typeof Bun.serve> | null = null;

export function startServer(): ReturnType<typeof Bun.serve> {
	const port = CONFIG.WEB_PORT;

	logger.info(
		`[Server] Starting Telegram Mini App HTTP server on port ${port}...`,
	);

	serverInstance = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			if (req.method === "OPTIONS") {
				return new Response(null, {
					status: 204,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Headers": "*",
						"Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
					},
				});
			}

			if (url.pathname.startsWith("/api/")) {
				const auth = await getAuthContext(req);
				if (
					url.pathname !== "/api/me" &&
					url.pathname !== "/api/auth/verify" &&
					(!auth.valid || !auth.user)
				) {
					return errorResponse(
						"[API] Unauthorized: Invalid Telegram initData",
						401,
					);
				}
				return handleApiRequest(req, url, auth);
			}

			return serveStaticFile(url.pathname);
		},
	});

	logger.info(`[Server] HTTP server running at http://localhost:${port}`);
	return serverInstance;
}

export function stopServer(): void {
	if (serverInstance) {
		try {
			serverInstance.stop();
			logger.info("[Server] HTTP server stopped.");
		} catch (e) {
			logger.error("[Server] Error stopping HTTP server:", e);
		}
		serverInstance = null;
	}
}
