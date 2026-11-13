import type { AuthContext } from "../../../web/src/types";
import { db } from "../../db/index";
import { type MemoryCategory, Repository } from "../../db/repository";
import { generateEmbedding, processNewMemory } from "../../services/memory";
import { isPlaceholderChatTitle } from "../../utils/chatTitle";
import logger from "../../utils/logger";
import { errorResponse, jsonResponse } from "../http";

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

function buildOwnerMemoryFilter(
	chatIdParam: string | null,
	filterScope: string | null,
	userId?: number,
): { conditions: string[]; params: (string | number)[] } {
	const conditions: string[] = [];
	const params: (string | number)[] = [];
	if (chatIdParam) {
		conditions.push("m.chat_id = ?");
		params.push(chatIdParam);
	}
	if (filterScope === "mine" && userId) {
		conditions.push("m.user_id = ?");
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
		return { conditions: ["m.chat_id = ?"], params: [chatIdParam] };
	}

	return {
		conditions: ["m.chat_id = ? AND (m.user_id = ? OR m.category = 'PROFILE')"],
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
		return { conditions: ["m.user_id = ?"], params: [auth.user.id] };
	}

	const placeholders = allowedChats.map(() => "?").join(",");
	return {
		conditions: [`(m.chat_id IN (${placeholders}) OR m.user_id = ?)`],
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
		return { conditions: ["m.user_id = ?"], params: [auth.user.id] };
	}
	if (chatIdParam) {
		return buildChatIdMemoryFilter(auth, chatIdParam);
	}
	if (auth.role === "admin") {
		return buildGlobalAdminMemoryFilter(auth);
	}
	return { conditions: ["m.user_id = ?"], params: [auth.user.id] };
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

	let query = `
		SELECT 
			m.id, m.chat_id, m.content AS memory_text, m.created_at, m.updated_at,
			m.user_id, m.category, m.expires_at,
			c.title as chat_title,
			u.first_name as user_first_name,
			u.username as user_username
		FROM memories m
		LEFT JOIN chats c ON m.chat_id = c.chat_id
		LEFT JOIN users u ON m.user_id = u.user_id
	`;
	const conditions = filterRes.conditions;
	const params = filterRes.params;

	if (categoryParam) {
		conditions.push("m.category = ?");
		params.push(categoryParam);
	}
	if (searchParam) {
		conditions.push("LOWER(m.content) LIKE ?");
		params.push(`%${searchParam}%`);
	}

	if (conditions.length > 0) {
		query += ` WHERE ${conditions.join(" AND ")}`;
	}
	query += " ORDER BY m.created_at DESC LIMIT 500";

	const rows = db.prepare(query).all(...params) as {
		id: number;
		chat_id: string;
		memory_text: string;
		created_at: number;
		updated_at: number;
		user_id: number | null;
		category: string;
		expires_at: number | null;
		chat_title: string | null;
		user_first_name: string | null;
		user_username: string | null;
	}[];

	const mapped = rows.map((row) => {
		let chatTitle = row.chat_title;
		if (isPlaceholderChatTitle(chatTitle)) {
			if (auth.user && row.chat_id === auth.user.id.toString()) {
				chatTitle = `Personal Profile (${auth.user.first_name || "Me"})`;
			} else if (row.user_first_name) {
				chatTitle = `${row.user_first_name} (Private)`;
			} else {
				chatTitle = `Group (${row.chat_id})`;
			}
		}
		return {
			...row,
			chat_title: chatTitle,
		};
	});

	return jsonResponse(mapped);
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

		if (Repository.isUserOptedOut(auth.user.id)) {
			return errorResponse(
				"Cannot create memory: You are opted out of bot memory and processing.",
				400,
			);
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
		logger.error("[Server] Error adding memory:", e);
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
	const { id } = lookup;

	try {
		const body = (await req.json()) as {
			memoryText?: string;
			category?: MemoryCategory;
		};
		if (!body.memoryText) return errorResponse("memoryText is required");

		const emb = await generateEmbedding(body.memoryText);
		Repository.updateMemory(id, {
			content: body.memoryText,
			category: body.category,
			embedding: emb,
		});

		return jsonResponse({
			success: true,
			message: `Memory ${id} updated`,
		});
	} catch (e) {
		logger.error("[Server] Error updating memory:", e);
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

		const changes = Repository.pruneExpiredMemories(body.chatId);

		return jsonResponse({ success: true, prunedCount: changes });
	} catch (e) {
		logger.error("[Server] Error pruning expired memories:", e);
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
			"SELECT chat_id, content AS memory_text, created_at, updated_at, user_id, category, expires_at FROM memories";
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
		logger.error("[Server] Error exporting memories:", e);
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
		logger.error("[Server] Error importing memories:", e);
		return errorResponse("Failed to import memories", 500);
	}
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
		Repository.deleteMemoriesByIds([lookup.id]);
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

export function handleMemoryRoutes(
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
