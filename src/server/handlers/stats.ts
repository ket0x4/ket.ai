import fs from "node:fs";
import type { AuthContext } from "../../../web/src/types";
import {
	type BotSettingsUpdate,
	CONFIG,
	updateBotSettings,
} from "../../config/index";
import { db } from "../../db/index";
import { Repository } from "../../db/repository";
import { formatChatTitle } from "../../utils/chatTitle";
import logger from "../../utils/logger";
import { errorResponse, jsonResponse } from "../http";

function buildCategoryStats(
	catRows: { category: string; count: number }[],
): Record<string, number> {
	const categoryStats: Record<string, number> = {
		PROFILE: 0,
		DYNAMIC: 0,
		TEMPORARY: 0,
	};
	for (const r of catRows) {
		const k = r.category || "PROFILE";
		categoryStats[k] = (categoryStats[k] || 0) + r.count;
	}
	return categoryStats;
}

function formatTopChats(
	chats: Array<{
		chat_id: string;
		title: string | null;
		is_allowed: number;
		message_count: number;
	}>,
) {
	return chats.map((c) => ({
		...c,
		title: formatChatTitle(c.chat_id, c.title),
	}));
}

function getOwnerStats(): Response {
	const chatsRow = db.prepare("SELECT COUNT(*) as count FROM chats").get() as {
		count: number;
	};
	const allowedRow = db
		.prepare("SELECT COUNT(*) as count FROM chats WHERE is_allowed = 1")
		.get() as { count: number };
	const messagesRow = db
		.prepare("SELECT COUNT(*) as count FROM messages")
		.get() as { count: number };
	const memoriesRow = db
		.prepare("SELECT COUNT(*) as count FROM memories")
		.get() as { count: number };

	const catRows = db
		.prepare(
			"SELECT category, COUNT(*) as count FROM memories GROUP BY category",
		)
		.all() as { category: string; count: number }[];
	const categoryStats = buildCategoryStats(catRows);

	let dbSizeBytes = 0;
	try {
		if (fs.existsSync(CONFIG.DB_PATH)) {
			dbSizeBytes = fs.statSync(CONFIG.DB_PATH).size;
		}
	} catch {}

	const rawTopChats = db
		.prepare(`
			SELECT c.chat_id, c.title, c.is_allowed, COUNT(m.id) as message_count
			FROM chats c
			LEFT JOIN messages m ON c.chat_id = m.chat_id
			GROUP BY c.chat_id
			ORDER BY message_count DESC LIMIT 3
		`)
		.all() as Array<{
		chat_id: string;
		title: string | null;
		is_allowed: number;
		message_count: number;
	}>;
	const topChats = formatTopChats(rawTopChats);

	const memUsage = process.memoryUsage();

	return jsonResponse({
		role: "owner",
		totalChats: chatsRow?.count || 0,
		allowedChats: allowedRow?.count || 0,
		totalMessages: messagesRow?.count || 0,
		totalMemories: memoriesRow?.count || 0,
		categoryStats,
		dbSizeBytes,
		topChats,
		uptimeSeconds: Math.floor(process.uptime()),
		memoryUsageMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
		model:
			CONFIG.LLM_PROVIDER === "openai"
				? CONFIG.OPENAI_MODEL
				: CONFIG.GEMINI_MODEL,
		llm_provider: CONFIG.LLM_PROVIDER,
		webSearch: CONFIG.ENABLE_WEB_SEARCH,
	});
}

function getAdminStats(adminChatIds: string[]): Response {
	if (adminChatIds.length === 0) {
		return jsonResponse({
			role: "admin",
			managedGroupsCount: 0,
			totalMessages: 0,
			totalMemories: 0,
			categoryStats: { PROFILE: 0, DYNAMIC: 0, TEMPORARY: 0 },
			topChats: [],
		});
	}

	const chatPlaceholders = adminChatIds.map(() => "?").join(",");
	const messagesRow = db
		.prepare(
			`SELECT COUNT(*) as count FROM messages WHERE chat_id IN (${chatPlaceholders})`,
		)
		.get(...adminChatIds) as { count: number };
	const memoriesRow = db
		.prepare(
			`SELECT COUNT(*) as count FROM memories WHERE chat_id IN (${chatPlaceholders})`,
		)
		.get(...adminChatIds) as { count: number };

	const catRows = db
		.prepare(
			`SELECT category, COUNT(*) as count FROM memories WHERE chat_id IN (${chatPlaceholders}) GROUP BY category`,
		)
		.all(...adminChatIds) as { category: string; count: number }[];
	const categoryStats = buildCategoryStats(catRows);

	const rawTopChats = db
		.prepare(`
			SELECT c.chat_id, c.title, c.is_allowed, COUNT(m.id) as message_count
			FROM chats c
			LEFT JOIN messages m ON c.chat_id = m.chat_id
			WHERE c.chat_id IN (${chatPlaceholders})
			GROUP BY c.chat_id
			ORDER BY message_count DESC LIMIT 3
		`)
		.all(...adminChatIds) as Array<{
		chat_id: string;
		title: string | null;
		is_allowed: number;
		message_count: number;
	}>;
	const topChats = formatTopChats(rawTopChats);

	return jsonResponse({
		role: "admin",
		managedGroupsCount: adminChatIds.length,
		totalMessages: messagesRow?.count || 0,
		totalMemories: memoriesRow?.count || 0,
		categoryStats,
		topChats,
	});
}

export function handleStats(auth: AuthContext): Response {
	try {
		if (auth.role === "owner") {
			return getOwnerStats();
		}
		if (auth.role === "admin") {
			return getAdminStats(auth.adminChatIds);
		}
		if (auth.user) {
			const userStats = Repository.getUserStats(auth.user.id);
			return jsonResponse({
				role: "user",
				totalMessages: userStats.totalMessages,
				totalMemories: userStats.totalMemories,
				totalGroups: userStats.totalGroups,
			});
		}
		return errorResponse("User context missing", 400);
	} catch (e) {
		logger.error("[Server] Error fetching stats:", e);
		return errorResponse("Failed to fetch stats", 500);
	}
}

export async function handleSettings(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	if (!auth.isOwner) {
		return errorResponse(
			"Forbidden: Only bot owner can view or edit global settings",
			403,
		);
	}

	const getSettingsSnapshot = () => ({
		llm_provider: CONFIG.LLM_PROVIDER,
		gemini_model: CONFIG.GEMINI_MODEL,
		openai_model: CONFIG.OPENAI_MODEL,
		openai_base_url: CONFIG.OPENAI_BASE_URL,
		default_reply_probability: CONFIG.DEFAULT_REPLY_PROBABILITY,
		chat_history_limit: CONFIG.CHAT_HISTORY_LIMIT,
		enable_web_search: CONFIG.ENABLE_WEB_SEARCH,
		max_agent_steps: CONFIG.MAX_AGENT_STEPS,
		log_level: CONFIG.LOG_LEVEL,
	});

	if (req.method === "GET") {
		return jsonResponse(getSettingsSnapshot());
	}

	if (req.method === "PATCH") {
		try {
			const body = (await req.json()) as BotSettingsUpdate;
			updateBotSettings(body);
			return jsonResponse({
				success: true,
				message: "Settings updated successfully",
				settings: getSettingsSnapshot(),
			});
		} catch (e) {
			logger.error("[Server] Error updating settings:", e);
			return errorResponse("Failed to update settings", 500);
		}
	}
	return errorResponse("Method not allowed", 405);
}
