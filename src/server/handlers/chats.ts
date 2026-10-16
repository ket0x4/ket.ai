import type { AuthContext, TelegramUser } from "../../../web/src/types";
import { db } from "../../db/index";
import { Repository } from "../../db/repository/index";
import { bot } from "../../services/bot/index";
import { isPlaceholderChatTitle } from "../../utils/chatTitle";
import logger from "../../utils/logger";
import { extractTelegramChatTitle } from "../../utils/message";
import { errorResponse, jsonResponse } from "../http";

async function fetchTelegramTitle(chatId: string): Promise<string | null> {
	try {
		const tgChat = await bot.api.getChat(chatId);
		const title = extractTelegramChatTitle(tgChat);
		return title || null;
	} catch {
		// Ignore Telegram API fetch errors
	}
	return null;
}

function getRecentUserFallback(chatId: string): string {
	try {
		const recentUser = db
			.prepare(
				`SELECT u.first_name, u.username FROM messages m JOIN users u ON m.user_id = u.user_id WHERE m.chat_id = ? AND m.is_bot_reply = 0 ORDER BY m.sent_at DESC LIMIT 1`,
			)
			.get(chatId) as { first_name: string; username: string | null } | null;

		if (recentUser?.first_name) {
			return chatId.startsWith("-")
				? `Group (${recentUser.first_name} & Group)`
				: `Chat (${recentUser.first_name})`;
		}
	} catch {}

	return chatId.startsWith("-") ? `Group (${chatId})` : `User (${chatId})`;
}

async function resolveChatDisplayTitle(
	chatId: string,
	currentTitle: string | null | undefined,
	currentUser?: TelegramUser,
): Promise<string> {
	if (currentTitle && !isPlaceholderChatTitle(currentTitle)) {
		return currentTitle;
	}

	const tgTitle = await fetchTelegramTitle(chatId);
	if (tgTitle) {
		Repository.updateChatSettings(chatId, { title: tgTitle });
		return tgTitle;
	}

	if (currentUser && chatId === currentUser.id.toString()) {
		return `Personal Chat (${currentUser.first_name || "Me"})`;
	}

	return getRecentUserFallback(chatId);
}

async function handleChatsGet(auth: AuthContext): Promise<Response> {
	try {
		let query = "SELECT * FROM chats";
		const params: string[] = [];

		if (auth.role === "owner") {
			query += " ORDER BY created_at DESC";
		} else if (auth.role === "admin") {
			const allRelevantChats = Array.from(
				new Set([...auth.adminChatIds, ...auth.memberChatIds]),
			);
			if (allRelevantChats.length === 0) return jsonResponse([]);
			const placeholders = allRelevantChats.map(() => "?").join(",");
			query += ` WHERE chat_id IN (${placeholders}) ORDER BY created_at DESC`;
			params.push(...allRelevantChats);
		} else {
			if (auth.memberChatIds.length === 0) return jsonResponse([]);
			const placeholders = auth.memberChatIds.map(() => "?").join(",");
			query += ` WHERE chat_id IN (${placeholders}) ORDER BY created_at DESC`;
			params.push(...auth.memberChatIds);
		}

		const chats = db.prepare(query).all(...params) as {
			chat_id: string;
			title: string | null;
			reply_probability: number;
			last_random_reply_at: number;
			current_topic: string | null;
			is_allowed: number;
			active_persona_id: string | null;
			created_at: number;
		}[];

		const result = await Promise.all(
			chats.map(async (c) => {
				const stats = Repository.getChatStats(c.chat_id);
				const memCount = Repository.getMemoryCount(c.chat_id);
				const isAdmin = auth.isOwner || auth.adminChatIds.includes(c.chat_id);

				const displayTitle = await resolveChatDisplayTitle(
					c.chat_id,
					c.title,
					auth.user,
				);

				return {
					...c,
					title: displayTitle,
					is_allowed: Boolean(c.is_allowed),
					active_persona_id: c.active_persona_id,
					stats,
					memoryCount: memCount,
					isAdmin,
				};
			}),
		);

		return jsonResponse(result);
	} catch (e) {
		logger.error("[Server] Error fetching chats:", e);
		return errorResponse("Failed to fetch chats", 500);
	}
}

async function handleChatPatch(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	const chatId = pathname.replace("/api/chats/", "");
	if (!chatId) return errorResponse("Invalid chat ID");

	const isAdmin = auth.isOwner || auth.adminChatIds.includes(chatId);
	if (!isAdmin) {
		return errorResponse(
			"Forbidden: You are not an administrator of this chat",
			403,
		);
	}

	try {
		const body = (await req.json()) as {
			is_allowed?: boolean;
			reply_probability?: number;
		};

		if (typeof body.is_allowed === "boolean") {
			if (!auth.isOwner) {
				return errorResponse(
					"Forbidden: Only bot owner can approve or disable groups",
					403,
				);
			}
			Repository.setChatAllowed(chatId, body.is_allowed);
		}

		if (typeof body.reply_probability === "number") {
			Repository.updateChatSettings(chatId, {
				reply_probability: body.reply_probability,
			});
		}

		return jsonResponse({
			success: true,
			message: `Chat ${chatId} updated`,
		});
	} catch (e) {
		logger.error("[Server] Error updating chat:", e);
		return errorResponse("Failed to update chat", 500);
	}
}

export function handleChatRoutes(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> | Response | null {
	if (pathname === "/api/chats" && req.method === "GET") {
		return handleChatsGet(auth);
	}
	if (pathname.startsWith("/api/chats/") && req.method === "PATCH") {
		return handleChatPatch(pathname, req, auth);
	}
	return null;
}
