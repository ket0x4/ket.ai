import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CONFIG, updateBotSettings } from "../config/index";
import { db } from "../db/index";
import { Repository } from "../db/repository";
import { bot } from "../services/bot";
import { ai } from "../services/gemini/client";
import { generateEmbedding, processNewMemory } from "../services/gemini/memory";
import { getSystemInstruction } from "../services/gemini/utils";
import logger from "../utils/logger";
import { ToolTraceLogger } from "../utils/toolTrace";

interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: boolean;
}

type UserRole = "owner" | "admin" | "user";

interface AuthContext {
	valid: boolean;
	user?: TelegramUser;
	role: UserRole;
	isOwner: boolean;
	adminChatIds: string[];
	memberChatIds: string[];
}

// In-memory cache for Telegram group administrator status (5 min TTL)
const adminStatusCache = new Map<
	string,
	{ isAdmin: boolean; expiresAt: number }
>();

async function checkIsChatAdmin(
	chatId: string,
	userId: number,
): Promise<boolean> {
	if (CONFIG.BOT_OWNER_ID && userId === CONFIG.BOT_OWNER_ID) return true;
	if (chatId === userId.toString()) return true;

	const cacheKey = `${chatId}:${userId}`;
	const cached = adminStatusCache.get(cacheKey);
	const now = Date.now();
	if (cached && cached.expiresAt > now) {
		return cached.isAdmin;
	}

	try {
		const member = await bot.api.getChatMember(chatId, userId);
		const isAdmin = ["creator", "administrator"].includes(member.status);
		adminStatusCache.set(cacheKey, { isAdmin, expiresAt: now + 5 * 60 * 1000 });
		return isAdmin;
	} catch {
		adminStatusCache.set(cacheKey, {
			isAdmin: false,
			expiresAt: now + 60 * 1000,
		});
		return false;
	}
}

/**
 * Validates Telegram initData cryptographic signature.
 */
function verifyTelegramInitData(
	initDataRaw: string,
	botToken: string,
): { valid: boolean; user?: TelegramUser } {
	if (!initDataRaw) {
		return { valid: false };
	}

	try {
		const urlParams = new URLSearchParams(initDataRaw);
		const hash = urlParams.get("hash");
		if (!hash) {
			return { valid: false };
		}

		urlParams.delete("hash");

		const params: string[] = [];
		urlParams.forEach((val, key) => {
			params.push(`${key}=${val}`);
		});
		params.sort();

		const dataCheckString = params.join("\n");

		const secretKey = crypto
			.createHmac("sha256", "WebAppData")
			.update(botToken)
			.digest();
		const calculatedHash = crypto
			.createHmac("sha256", secretKey)
			.update(dataCheckString)
			.digest("hex");

		if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
			return { valid: false };
		}

		const userStr = urlParams.get("user");
		const user: TelegramUser | undefined = userStr
			? JSON.parse(userStr)
			: undefined;

		return { valid: Boolean(user), user };
	} catch (error) {
		logger.error("[Server Auth] Error validating initData:", error);
		return { valid: false };
	}
}

function makeGuestAuthContext(): AuthContext {
	return {
		valid: false,
		role: "user",
		isOwner: false,
		adminChatIds: [],
		memberChatIds: [],
	};
}

async function resolveAdminChatIds(
	userId: number,
	isOwner: boolean,
	memberChatIds: string[],
): Promise<string[]> {
	if (isOwner) {
		const allChats = db.prepare("SELECT chat_id FROM chats").all() as {
			chat_id: string;
		}[];
		return allChats.map((c) => c.chat_id);
	}
	const adminChatIds: string[] = [];
	for (const chatId of memberChatIds) {
		if (chatId !== userId.toString()) {
			const isAdmin = await checkIsChatAdmin(chatId, userId);
			if (isAdmin) adminChatIds.push(chatId);
		}
	}
	return adminChatIds;
}

/**
 * Extracts and resolves full role and permissions from Request.
 */
async function getAuthContext(req: Request): Promise<AuthContext> {
	const initData =
		req.headers.get("x-telegram-init-data") ||
		new URL(req.url).searchParams.get("initData") ||
		new URL(req.url).searchParams.get("tgWebAppData") ||
		"";

	if (!initData) return makeGuestAuthContext();

	const { valid, user } = verifyTelegramInitData(
		initData,
		CONFIG.TELEGRAM_BOT_TOKEN,
	);
	if (!valid || !user) return makeGuestAuthContext();

	const isOwner = Boolean(
		CONFIG.BOT_OWNER_ID && user.id === CONFIG.BOT_OWNER_ID,
	);
	const memberChatIds = Repository.getUserMemberChatIds(user.id);
	const adminChatIds = await resolveAdminChatIds(
		user.id,
		isOwner,
		memberChatIds,
	);

	const role: UserRole = isOwner
		? "owner"
		: adminChatIds.length > 0
			? "admin"
			: "user";

	return {
		valid: true,
		user,
		role,
		isOwner,
		adminChatIds,
		memberChatIds,
	};
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "*",
			"Access-Control-Allow-Methods": "*",
		},
	});
}

function errorResponse(message: string, status = 400): Response {
	return jsonResponse({ error: message }, status);
}

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

type MemoryLookupResult =
	| {
			success: true;
			id: number;
			memory: NonNullable<ReturnType<typeof Repository.getMemoryById>>;
	  }
	| { success: false; response: Response };

function resolveMemoryForAction(
	pathname: string,
	auth: AuthContext,
	actionName: string,
): MemoryLookupResult {
	const idStr = pathname.replace("/api/memories/", "");
	const id = parseInt(idStr, 10);
	if (Number.isNaN(id)) {
		return { success: false, response: errorResponse("Invalid memory ID") };
	}

	const memory = Repository.getMemoryById(id);
	if (!memory) {
		return { success: false, response: errorResponse("Memory not found", 404) };
	}

	let allowed = false;
	if (auth.role === "owner") {
		allowed = true;
	} else if (auth.role === "admin") {
		allowed =
			auth.adminChatIds.includes(memory.chat_id) ||
			memory.user_id === auth.user?.id;
	} else {
		allowed = memory.user_id === auth.user?.id;
	}

	if (!allowed) {
		return {
			success: false,
			response: errorResponse(
				`Forbidden: You cannot ${actionName} this memory`,
				403,
			),
		};
	}

	return { success: true, id, memory };
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

	const topChats = db
		.prepare(`
			SELECT c.chat_id, c.title, c.is_allowed, COUNT(m.id) as message_count
			FROM chats c
			LEFT JOIN messages m ON c.chat_id = m.chat_id
			GROUP BY c.chat_id
			ORDER BY message_count DESC LIMIT 3
		`)
		.all();

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
		model: CONFIG.GEMINI_MODEL,
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

	const topChats = db
		.prepare(`
			SELECT c.chat_id, c.title, c.is_allowed, COUNT(m.id) as message_count
			FROM chats c
			LEFT JOIN messages m ON c.chat_id = m.chat_id
			WHERE c.chat_id IN (${chatPlaceholders})
			GROUP BY c.chat_id
			ORDER BY message_count DESC LIMIT 3
		`)
		.all(...adminChatIds);

	return jsonResponse({
		role: "admin",
		managedGroupsCount: adminChatIds.length,
		totalMessages: messagesRow?.count || 0,
		totalMemories: memoriesRow?.count || 0,
		categoryStats,
		topChats,
	});
}

function handleStats(auth: AuthContext): Response {
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
		logger.error("[Server Stats] Error fetching stats:", e);
		return errorResponse("Failed to fetch stats", 500);
	}
}

async function handleSettings(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	if (!auth.isOwner) {
		return errorResponse(
			"Forbidden: Only bot owner can view or edit global settings",
			403,
		);
	}

	if (req.method === "GET") {
		return jsonResponse({
			gemini_model: CONFIG.GEMINI_MODEL,
			default_reply_probability: CONFIG.DEFAULT_REPLY_PROBABILITY,
			chat_history_limit: CONFIG.CHAT_HISTORY_LIMIT,
			enable_web_search: CONFIG.ENABLE_WEB_SEARCH,
			max_agent_steps: CONFIG.MAX_AGENT_STEPS,
			log_level: CONFIG.LOG_LEVEL,
		});
	}

	if (req.method === "PATCH") {
		try {
			const body = (await req.json()) as {
				gemini_model?: string;
				default_reply_probability?: number;
				chat_history_limit?: number;
				enable_web_search?: boolean;
				max_agent_steps?: number;
				log_level?: "debug" | "info" | "warn" | "error";
			};
			updateBotSettings(body);
			return jsonResponse({
				success: true,
				message: "Settings updated successfully",
				settings: {
					gemini_model: CONFIG.GEMINI_MODEL,
					default_reply_probability: CONFIG.DEFAULT_REPLY_PROBABILITY,
					chat_history_limit: CONFIG.CHAT_HISTORY_LIMIT,
					enable_web_search: CONFIG.ENABLE_WEB_SEARCH,
					max_agent_steps: CONFIG.MAX_AGENT_STEPS,
					log_level: CONFIG.LOG_LEVEL,
				},
			});
		} catch (e) {
			logger.error("[Server Settings PATCH] Error updating settings:", e);
			return errorResponse("Failed to update settings", 500);
		}
	}
	return errorResponse("Method not allowed", 405);
}

function buildOwnerMemoryFilter(
	chatIdParam: string | null,
	filterScope: string | null,
	userId?: number,
): { conditions: string[]; params: (string | number)[] } {
	const conditions: string[] = [];
	const params: (string | number)[] = [];
	if (chatIdParam) {
		conditions.push("chat_id = ?");
		params.push(chatIdParam);
	}
	if (filterScope === "mine" && userId) {
		conditions.push("user_id = ?");
		params.push(userId);
	}
	return { conditions, params };
}

function buildChatIdMemoryFilter(
	auth: AuthContext,
	chatIdParam: string,
): { conditions: string[]; params: (string | number)[]; forbidden?: boolean } {
	if (!auth.user) return { conditions: [], params: [] };

	const canAccess =
		auth.role === "admin"
			? auth.adminChatIds.includes(chatIdParam) ||
				auth.memberChatIds.includes(chatIdParam)
			: auth.memberChatIds.includes(chatIdParam);

	if (!canAccess) {
		return { conditions: [], params: [], forbidden: true };
	}

	if (auth.role === "admin") {
		return { conditions: ["chat_id = ?"], params: [chatIdParam] };
	}

	return {
		conditions: ["chat_id = ? AND (user_id = ? OR category = 'PROFILE')"],
		params: [chatIdParam, auth.user.id],
	};
}

function buildGlobalAdminMemoryFilter(auth: AuthContext): {
	conditions: string[];
	params: (string | number)[];
} {
	if (!auth.user) return { conditions: [], params: [] };

	const allowedChats = Array.from(
		new Set([...auth.adminChatIds, ...auth.memberChatIds]),
	);
	if (allowedChats.length === 0) {
		return { conditions: ["user_id = ?"], params: [auth.user.id] };
	}

	const placeholders = allowedChats.map(() => "?").join(",");
	return {
		conditions: [`(chat_id IN (${placeholders}) OR user_id = ?)`],
		params: [...allowedChats, auth.user.id],
	};
}

function buildScopedMemoryFilter(
	auth: AuthContext,
	chatIdParam: string | null,
	filterScope: string | null,
): { conditions: string[]; params: (string | number)[]; forbidden?: boolean } {
	if (auth.role === "owner") {
		return buildOwnerMemoryFilter(chatIdParam, filterScope, auth.user?.id);
	}
	if (!auth.user) return { conditions: [], params: [] };
	if (filterScope === "mine") {
		return { conditions: ["user_id = ?"], params: [auth.user.id] };
	}
	if (chatIdParam) {
		return buildChatIdMemoryFilter(auth, chatIdParam);
	}
	if (auth.role === "admin") {
		return buildGlobalAdminMemoryFilter(auth);
	}
	return { conditions: ["user_id = ?"], params: [auth.user.id] };
}

function handleMemoriesGet(url: URL, auth: AuthContext): Response {
	const chatIdParam = url.searchParams.get("chat_id");
	const searchParam = url.searchParams.get("search")?.toLowerCase() || "";
	const categoryParam = url.searchParams.get("category");
	const filterScope = url.searchParams.get("scope");

	const filterRes = buildScopedMemoryFilter(auth, chatIdParam, filterScope);

	if (filterRes.forbidden) {
		return errorResponse(
			"Forbidden: You do not have permission for this chat's memories",
			403,
		);
	}

	let query =
		"SELECT id, chat_id, memory_text, created_at, user_id, category, expires_at FROM memories";
	const conditions = filterRes.conditions;
	const params = filterRes.params;

	if (categoryParam) {
		conditions.push("category = ?");
		params.push(categoryParam);
	}

	if (conditions.length > 0) {
		query += ` WHERE ${conditions.join(" AND ")}`;
	}
	query += " ORDER BY created_at DESC LIMIT 500";

	const rows = db.prepare(query).all(...params) as {
		id: number;
		chat_id: string;
		memory_text: string;
		created_at: number;
		user_id: number | null;
		category: string;
		expires_at: number | null;
	}[];

	const filtered = rows.filter((r) =>
		searchParam ? r.memory_text.toLowerCase().includes(searchParam) : true,
	);

	return jsonResponse(filtered);
}

async function handleMemoriesPost(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	if (!auth.user) return errorResponse("Unauthorized", 401);
	try {
		const body = (await req.json()) as {
			chatId: string;
			memoryText: string;
			category?: "PROFILE" | "DYNAMIC" | "TEMPORARY";
		};

		if (!body.chatId || !body.memoryText) {
			return errorResponse("Missing chatId or memoryText");
		}

		if (auth.role === "user") {
			if (
				body.chatId !== auth.user.id.toString() &&
				!auth.memberChatIds.includes(body.chatId)
			) {
				return errorResponse(
					"Forbidden: You cannot add memories to unjoined chats",
					403,
				);
			}
		} else if (auth.role === "admin") {
			if (
				!auth.adminChatIds.includes(body.chatId) &&
				body.chatId !== auth.user.id.toString()
			) {
				return errorResponse(
					"Forbidden: You are not an admin of this chat",
					403,
				);
			}
		}

		await processNewMemory(body.chatId, body.memoryText, {
			category: body.category || "PROFILE",
			userId: auth.user.id,
		});

		return jsonResponse({
			success: true,
			message: "Memory created successfully",
		});
	} catch (e) {
		logger.error("[Server Memory POST] Error adding memory:", e);
		return errorResponse("Failed to create memory", 500);
	}
}

async function handleMemoryPatch(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	const lookup = resolveMemoryForAction(pathname, auth, "edit");
	if (!lookup.success) return lookup.response;
	const { id, memory } = lookup;

	try {
		const body = (await req.json()) as {
			memoryText?: string;
			category?: string;
		};
		if (!body.memoryText) return errorResponse("memoryText is required");

		const emb = await generateEmbedding(body.memoryText, "RETRIEVAL_DOCUMENT");
		Repository.updateMemory(
			id,
			body.memoryText,
			body.category,
			emb,
			memory.chat_id,
		);

		return jsonResponse({
			success: true,
			message: `Memory ${id} updated`,
		});
	} catch (e) {
		logger.error("[Server Memory PATCH] Error updating memory:", e);
		return errorResponse("Failed to update memory", 500);
	}
}

async function handleMemoriesPrune(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	try {
		const body = (await req.json().catch(() => ({}))) as {
			chatId?: string;
		};

		if (auth.role === "user") {
			return errorResponse(
				"Forbidden: Regular users cannot prune group memories",
				403,
			);
		}

		if (auth.role === "admin") {
			if (!body.chatId || !auth.adminChatIds.includes(body.chatId)) {
				return errorResponse(
					"Forbidden: You can only prune memories for your managed groups",
					403,
				);
			}
		}

		const now = Math.floor(Date.now() / 1000);
		let changes = 0;
		if (body.chatId) {
			changes = Repository.pruneExpiredMemories(body.chatId);
		} else {
			const result = db
				.prepare(
					"DELETE FROM memories WHERE expires_at IS NOT NULL AND expires_at <= ?",
				)
				.run(now);
			changes = result.changes;
			Repository.clearMemoryCache();
		}

		return jsonResponse({ success: true, prunedCount: changes });
	} catch (e) {
		logger.error("[Server Prune] Error pruning expired memories:", e);
		return errorResponse("Failed to prune memories", 500);
	}
}

function handleMemoriesExport(auth: AuthContext): Response {
	if (auth.role === "user") {
		return errorResponse(
			"Forbidden: Export is restricted to group admins and bot owner",
			403,
		);
	}
	try {
		let query =
			"SELECT chat_id, memory_text, created_at, user_id, category, expires_at FROM memories";
		const params: string[] = [];
		if (auth.role === "admin") {
			const placeholders = auth.adminChatIds.map(() => "?").join(",") || "''";
			query += ` WHERE chat_id IN (${placeholders})`;
			params.push(...auth.adminChatIds);
		}
		query += " ORDER BY created_at DESC";
		const rows = db.prepare(query).all(...params);
		return jsonResponse({
			exportedAt: new Date().toISOString(),
			total: rows.length,
			memories: rows,
		});
	} catch (e) {
		logger.error("[Server Export] Error exporting memories:", e);
		return errorResponse("Failed to export memories", 500);
	}
}

async function handleMemoriesImport(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	if (auth.role === "user" || !auth.user) {
		return errorResponse(
			"Forbidden: Import is restricted to group admins and bot owner",
			403,
		);
	}
	try {
		const body = (await req.json()) as {
			memories: Array<{
				chatId?: string;
				chat_id?: string;
				memoryText?: string;
				memory_text?: string;
				category?: "PROFILE" | "DYNAMIC" | "TEMPORARY";
			}>;
		};

		if (!Array.isArray(body.memories)) {
			return errorResponse("Invalid format: memories array expected");
		}

		let count = 0;
		for (const mem of body.memories) {
			const chatId = mem.chatId || mem.chat_id;
			const text = mem.memoryText || mem.memory_text;
			if (chatId && text) {
				if (auth.role === "admin" && !auth.adminChatIds.includes(chatId)) {
					continue;
				}
				await processNewMemory(chatId, text, {
					category: mem.category || "PROFILE",
					userId: auth.user.id,
				});
				count++;
			}
		}

		return jsonResponse({ success: true, importedCount: count });
	} catch (e) {
		logger.error("[Server Import] Error importing memories:", e);
		return errorResponse("Failed to import memories", 500);
	}
}

async function handleSandbox(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	if (!auth.isOwner) {
		return errorResponse("Forbidden: Only bot owner can access sandbox", 403);
	}
	try {
		const body = (await req.json()) as {
			prompt: string;
			systemInstruction?: string;
		};
		if (!body.prompt?.trim()) {
			return errorResponse("Prompt is required");
		}

		const startTime = Date.now();
		const systemPrompt = body.systemInstruction || getSystemInstruction();

		const response = await ai.models.generateContent({
			model: CONFIG.GEMINI_MODEL,
			contents: [{ role: "user", parts: [{ text: body.prompt }] }],
			config: {
				systemInstruction: systemPrompt,
				temperature: 0.8,
				maxOutputTokens: 500,
			},
		});

		const durationMs = Date.now() - startTime;
		const replyText = response.text || "Empty response";

		return jsonResponse({
			reply: replyText,
			executionTimeMs: durationMs,
			model: CONFIG.GEMINI_MODEL,
		});
	} catch (e) {
		logger.error("[Server Sandbox] Error generating sandbox response:", e);
		return errorResponse(
			"Failed to generate response: " +
				(e instanceof Error ? e.message : String(e)),
			500,
		);
	}
}

function handleChatsGet(auth: AuthContext): Response {
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
			created_at: number;
		}[];

		const result = chats.map((c) => {
			const stats = Repository.getChatStats(c.chat_id);
			const memCount = Repository.getMemories(c.chat_id).length;
			const isAdmin = auth.isOwner || auth.adminChatIds.includes(c.chat_id);
			return {
				...c,
				is_allowed: Boolean(c.is_allowed),
				stats,
				memoryCount: memCount,
				isAdmin,
			};
		});

		return jsonResponse(result);
	} catch (e) {
		logger.error("[Server Chats GET] Error fetching chats:", e);
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
		logger.error("[Server Chat PATCH] Error updating chat:", e);
		return errorResponse("Failed to update chat", 500);
	}
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
		const limit = parseInt(url.searchParams.get("limit") || "150", 10);

		const logFilePath = path.join(process.cwd(), CONFIG.LOG_DIR, logType);
		if (!fs.existsSync(logFilePath)) {
			return jsonResponse({ logs: [] });
		}

		const rawContent = fs.readFileSync(logFilePath, "utf-8");
		const lines = rawContent.split("\n").filter((l) => l.trim().length > 0);
		const recentLines = lines.slice(-limit);

		const parsedLogs = recentLines
			.map((line, idx) => {
				const match = line.match(
					/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3})\s+\[([A-Z]+)\s*\]\s+(.*)$/,
				);
				if (match) {
					return {
						id: idx,
						timestamp: match[1],
						level: match[2],
						message: match[3],
						raw: line,
					};
				}
				return {
					id: idx,
					timestamp: "",
					level: "INFO",
					message: line,
					raw: line,
				};
			})
			.filter((log) => {
				if (levelFilter && levelFilter !== "ALL" && log.level !== levelFilter) {
					return false;
				}
				if (searchFilter && !log.raw.toLowerCase().includes(searchFilter)) {
					return false;
				}
				return true;
			});

		return jsonResponse({ logs: parsedLogs });
	} catch (e) {
		logger.error("[Server Logs GET] Error reading log file:", e);
		return errorResponse("Failed to read logs", 500);
	}
}

const MIME_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".webp": "image/webp",
};

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

function serveStaticFile(pathname: string): Response {
	try {
		const cleanPath = pathname === "/" ? "/index.html" : pathname;
		const ext = path.extname(cleanPath).toLowerCase();
		const filePath = path.join(PUBLIC_DIR, cleanPath);

		// Directory traversal security
		if (!filePath.startsWith(PUBLIC_DIR)) {
			return new Response("Forbidden", { status: 403 });
		}

		// When a static asset with file extension is requested
		if (ext) {
			if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
				return new Response("Not Found", {
					status: 404,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}

			const file = Bun.file(filePath);
			const mime = MIME_TYPES[ext] || file.type || "application/octet-stream";
			const isHashedAsset = cleanPath.startsWith("/assets/");

			return new Response(file, {
				headers: {
					"Content-Type": mime,
					"Cache-Control": isHashedAsset
						? "public, max-age=31536000, immutable"
						: "no-cache, no-store, must-revalidate",
				},
			});
		}

		// Single Page App fallback for HTML navigation
		const indexHtmlPath = path.join(PUBLIC_DIR, "index.html");
		if (!fs.existsSync(indexHtmlPath)) {
			return new Response(
				"Application not built. Please run bun run build:web.",
				{
					status: 404,
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				},
			);
		}

		const indexFile = Bun.file(indexHtmlPath);
		return new Response(indexFile, {
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				"Cache-Control": "no-cache, no-store, must-revalidate",
			},
		});
	} catch {
		return new Response("Internal Server Error", { status: 500 });
	}
}

function handleAuthAndStatsRoutes(
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
		});
	}
	if (pathname === "/api/stats" && req.method === "GET") {
		return handleStats(auth);
	}
	return null;
}

function handleIndividualMemoryRoutes(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> | Response | null {
	if (!pathname.startsWith("/api/memories/")) return null;
	if (req.method === "DELETE") {
		const lookup = resolveMemoryForAction(pathname, auth, "delete");
		if (!lookup.success) return lookup.response;
		Repository.deleteMemoriesByIds([lookup.id], lookup.memory.chat_id);
		return jsonResponse({
			success: true,
			message: `Memory ${lookup.id} deleted`,
		});
	}
	if (req.method === "PATCH") {
		return handleMemoryPatch(pathname, req, auth);
	}
	return null;
}

function handleBatchMemoryRoutes(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> | Response | null {
	if (pathname === "/api/memories/prune" && req.method === "POST") {
		return handleMemoriesPrune(req, auth);
	}
	if (pathname === "/api/memories/export" && req.method === "GET") {
		return handleMemoriesExport(auth);
	}
	if (pathname === "/api/memories/import" && req.method === "POST") {
		return handleMemoriesImport(req, auth);
	}
	return null;
}

function handleMemoryRoutes(
	pathname: string,
	req: Request,
	url: URL,
	auth: AuthContext,
): Promise<Response> | Response | null {
	if (pathname === "/api/memories") {
		if (req.method === "GET") return handleMemoriesGet(url, auth);
		if (req.method === "POST") return handleMemoriesPost(req, auth);
	}
	const batchRes = handleBatchMemoryRoutes(pathname, req, auth);
	if (batchRes) return batchRes;

	return handleIndividualMemoryRoutes(pathname, req, auth);
}

function handleChatRoutes(
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

function handleAdminAndToolsRoutes(
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
	if (pathname === "/api/sandbox" && req.method === "POST") {
		return handleSandbox(req, auth);
	}
	if (pathname === "/api/logs" && req.method === "GET") {
		return handleLogsGet(url, auth);
	}
	return null;
}

async function handleApiRequest(
	req: Request,
	url: URL,
	auth: AuthContext,
): Promise<Response> {
	const pathname = url.pathname;

	const authOrStats = handleAuthAndStatsRoutes(pathname, req, auth);
	if (authOrStats) return authOrStats;

	if (pathname === "/api/settings") {
		return handleSettings(req, auth);
	}
	if (pathname === "/api/settings/cache-clear" && req.method === "POST") {
		if (!auth.isOwner) {
			return errorResponse("Forbidden: Only bot owner can clear cache", 403);
		}
		Repository.clearMemoryCache();
		return jsonResponse({
			success: true,
			message: "Memory cache cleared successfully",
		});
	}

	const memoryRes = handleMemoryRoutes(pathname, req, url, auth);
	if (memoryRes) return memoryRes;

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
					return errorResponse("Unauthorized: Invalid Telegram initData", 401);
				}
				return handleApiRequest(req, url, auth);
			}

			return serveStaticFile(url.pathname);
		},
	});

	logger.info(
		`[Server] Telegram Mini App HTTP server running at http://localhost:${port}`,
	);
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
