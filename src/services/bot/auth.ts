import type { Context } from "grammy";
import { CONFIG } from "../../config/index";
import { db } from "../../db/index";
import { Repository } from "../../db/repository";
import { isPlaceholderChatTitle } from "../../utils/chatTitle";
import logger from "../../utils/logger";
import { extractTelegramChatTitle } from "../../utils/message";
import { bot } from "./instance";

const leavingChats = new Set<string>();

export async function handlePrivateChatAuth(
	ctx: Context,
	chatIdStr: string,
): Promise<boolean> {
	const isOwner = Boolean(
		CONFIG.BOT_OWNER_ID && ctx.from?.id === CONFIG.BOT_OWNER_ID,
	);
	if (isOwner) {
		const dbChat = Repository.getChat(chatIdStr);
		if (!dbChat) {
			Repository.createChat(
				chatIdStr,
				`Private Chat (${ctx.from?.first_name || "Owner"})`,
				true,
			);
		}
		return true;
	}
	await ctx.reply(CONFIG.MESSAGES.private_chat_unauthorized);
	return false;
}

async function handleUnauthorizedGroup(
	ctx: Context,
	chatIdStr: string,
	chatTitle?: string,
): Promise<void> {
	if (!ctx.message && !ctx.myChatMember) return;
	if (leavingChats.has(chatIdStr)) return;

	leavingChats.add(chatIdStr);
	logger.warn(
		`[Security] Bot active in unauthorized group: ${chatTitle || "Group"} (${chatIdStr}). Leaving...`,
	);
	try {
		await ctx.reply(CONFIG.MESSAGES.unauthorized_group_reply).catch(() => {});
		await ctx.leaveChat();
	} catch {
		logger.warn(`[Security] Could not cleanly leave chat ${chatIdStr}.`);
	}
	setTimeout(() => leavingChats.delete(chatIdStr), 60000);
}

export function triggerPeriodicRetentionCleanup(chatIdStr: string): void {
	const retentionCount = Repository.getMessageCount(chatIdStr);
	if (retentionCount <= 0 || retentionCount % 100 !== 0) return;

	void Promise.resolve().then(() => {
		try {
			const pruned = Repository.pruneOldMessages(chatIdStr, 7);
			if (pruned > 0) {
				logger.info(
					`[Retention] Pruned ${pruned} old messages from chat ${chatIdStr}`,
				);
			}
		} catch (err) {
			logger.error("[Retention] Error pruning old messages:", err);
		}
	});
}

export function checkBotWritePermission(
	botMember: { status: string; can_send_messages?: boolean },
	permissions?: { can_send_messages?: boolean },
): boolean {
	if (botMember.status === "administrator" || botMember.status === "creator") {
		return true;
	}
	if (botMember.status === "restricted") {
		return botMember.can_send_messages === true;
	}
	if (permissions) {
		return permissions.can_send_messages !== false;
	}
	return true;
}

async function syncSingleChatTitle(
	chatId: string,
	currentTitle: string | null,
): Promise<void> {
	if (!isPlaceholderChatTitle(currentTitle)) return;

	try {
		const tgChat = await bot.api.getChat(chatId);
		const realTitle = extractTelegramChatTitle(tgChat);

		if (realTitle) {
			Repository.updateChatSettings(chatId, { title: realTitle });
			logger.info(`[Bot Sync] Synced title for chat ${chatId}: "${realTitle}"`);
		}
	} catch {
		// Chat might not be accessible or bot not in chat yet
	}
}

/**
 * Automatically fetches and updates actual Telegram chat titles for chats with missing or placeholder titles.
 */
export async function syncChatTitles(): Promise<void> {
	try {
		const chats = db
			.prepare("SELECT chat_id, title FROM chats WHERE is_allowed = 1")
			.all() as Array<{ chat_id: string; title: string | null }>;

		for (const c of chats) {
			await syncSingleChatTitle(c.chat_id, c.title);
		}
	} catch (err) {
		logger.debug("[Bot Sync] Error during chat title synchronization:", err);
	}
}

export function formatChatFriendlyTitle(
	chat: NonNullable<Context["chat"]>,
	from?: Context["from"],
): string {
	if (chat.type === "private") {
		const name = from ? extractTelegramChatTitle(from) : "";
		return name || "Private Chat";
	}
	return chat.title || `Group (${chat.id.toString()})`;
}

export async function handleGroupAuth(
	ctx: Context,
	chatIdStr: string,
	chatTitle?: string,
): Promise<boolean> {
	const dbChat = Repository.getChat(chatIdStr);
	const isAllowed = dbChat?.is_allowed === 1;

	if (!isAllowed) {
		await handleUnauthorizedGroup(ctx, chatIdStr, chatTitle);
		return false;
	}

	if (chatTitle) {
		Repository.upsertChat(chatIdStr, chatTitle, true);
	}
	return true;
}
