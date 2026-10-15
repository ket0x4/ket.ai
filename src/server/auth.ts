import crypto from "node:crypto";
import type { AuthContext, TelegramUser, UserRole } from "../../web/src/types";
import { CONFIG } from "../config/index";
import { db } from "../db/index";
import { Repository } from "../db/repository";
import { bot } from "../services/bot";
import logger from "../utils/logger";

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
		logger.error("[Auth] Error validating initData:", error);
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
export async function getAuthContext(req: Request): Promise<AuthContext> {
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

	const isOptedOut = Repository.isUserOptedOut(user.id);

	return {
		valid: true,
		user: { ...user, is_opted_out: isOptedOut },
		role,
		isOwner,
		adminChatIds,
		memberChatIds,
		isOptedOut,
	};
}
