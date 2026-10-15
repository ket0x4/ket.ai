import type { AuthContext } from "../../../web/src/types";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { errorResponse, jsonResponse } from "../http";
import { handleStats } from "./stats";

export function handleAuthAndStatsRoutes(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Response | null {
	if (pathname === "/api/auth/verify" || pathname === "/api/me") {
		return jsonResponse({
			valid: true,
			user: auth.user,
			role: auth.role,
			isOwner: auth.isOwner,
			adminChatIds: auth.adminChatIds,
			memberChatIds: auth.memberChatIds,
			isOptedOut:
				auth.isOptedOut ??
				(auth.user ? Repository.isUserOptedOut(auth.user.id) : false),
		});
	}
	if (pathname === "/api/stats" && req.method === "GET") {
		return handleStats(auth);
	}
	return null;
}

export async function handleUserOptOut(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	if (!auth.valid || !auth.user) {
		return errorResponse("Unauthorized: Valid session required", 401);
	}

	if (req.method === "GET") {
		return jsonResponse({
			isOptedOut: Repository.isUserOptedOut(auth.user.id),
		});
	}

	if (req.method === "POST" || req.method === "PATCH") {
		try {
			const body = (await req.json().catch(() => ({}))) as {
				optedOut?: boolean;
				is_opted_out?: boolean;
			};
			const optedOut = Boolean(body.optedOut ?? body.is_opted_out);

			Repository.setUserOptOut(auth.user.id, optedOut, {
				username: auth.user.username,
				firstName: auth.user.first_name,
			});

			logger.info(
				`[Server] User ${auth.user.id} (${auth.user.first_name}) updated opt-out status to ${optedOut} via WebUI`,
			);

			return jsonResponse({
				success: true,
				isOptedOut: optedOut,
				message: optedOut
					? "You have successfully opted out of bot interactions and memory."
					: "You have successfully opted in to bot interactions.",
			});
		} catch (e) {
			logger.error("[Server] Error updating user opt-out status:", e);
			return errorResponse("Failed to update opt-out status", 500);
		}
	}

	return errorResponse("Method not allowed", 405);
}
