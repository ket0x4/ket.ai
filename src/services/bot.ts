import { type Context, Bot as GrammyBot } from "grammy";
import { CONFIG } from "../config/index";
import { Repository } from "../db/repository";
import { registerChatHandlers } from "../modules/chat";
import { registerCommandHandlers } from "../modules/commands";
import { registerImageHandlers } from "../modules/image";
import { registerVoiceHandlers } from "../modules/voice";
import logger from "../utils/logger";

export const bot = new GrammyBot(CONFIG.TELEGRAM_BOT_TOKEN);

// Global per-chat lock to prevent concurrency race conditions when generating replies
const chatLocks = new Map<string, Promise<void>>();

export async function withChatLock<T>(
	chatId: string,
	fn: () => Promise<T>,
): Promise<T> {
	const currentLock = chatLocks.get(chatId) || Promise.resolve();

	let releaseLock: () => void;
	const newLock = new Promise<void>((resolve) => {
		releaseLock = resolve;
	});

	chatLocks.set(
		chatId,
		currentLock.then(
			() => newLock,
			() => newLock,
		),
	);

	try {
		await currentLock;
		return await fn();
	} finally {
		// @ts-expect-error releaseLock is initialized inside new Promise executor synchronously
		releaseLock();
		if (chatLocks.get(chatId) === newLock) {
			chatLocks.delete(chatId);
		}
	}
}

function saveOutgoingMessage(
	chatId: string,
	msgId: number,
	text: string,
	sentMsg: unknown,
) {
	Repository.saveMessage({
		chatId,
		messageId: msgId,
		userId: 0,
		username: botUsername || "ket",
		firstName: "ket.ai",
		text,
		isBotReply: true,
		sentAt:
			(sentMsg as { date?: number })?.date || Math.floor(Date.now() / 1000),
	});
}

function isTransientStatusMessage(text: string): boolean {
	return (
		text === CONFIG.MESSAGES.tool_status_web_search ||
		text.includes("gimme a sec bro, checking")
	);
}

function extractOutgoingPayload(
	method: string,
	payload: unknown,
	result: unknown,
): { chatId: string; msgId: number; text: string } | null {
	if (method !== "sendMessage" && method !== "editMessageText") return null;
	if (!payload || typeof payload !== "object") return null;
	if (!("chat_id" in payload) || !("text" in payload)) return null;

	const payloadRecord = payload as Record<string, unknown>;
	const chatId = String(payloadRecord.chat_id ?? "");
	const text = String(payloadRecord.text ?? "");
	if (isTransientStatusMessage(text)) return null;

	const resultRecord =
		typeof result === "object" && result !== null
			? (result as Record<string, unknown>)
			: undefined;
	const msgId =
		(payloadRecord.message_id as number) ||
		(resultRecord?.message_id as number);

	if (!chatId || !msgId) return null;
	return { chatId, msgId, text };
}

function archiveOutgoingMessage(
	method: string,
	payload: unknown,
	result: unknown,
): void {
	try {
		const extracted = extractOutgoingPayload(method, payload, result);
		if (!extracted) return;
		const { chatId, msgId, text } = extracted;

		if (method === "editMessageText") {
			const updated = Repository.updateMessageText(chatId, msgId, text);
			if (!updated) {
				saveOutgoingMessage(chatId, msgId, text, result);
			}
		} else {
			saveOutgoingMessage(chatId, msgId, text, result);
		}
	} catch (e) {
		logger.error("[Bot Outgoing Logger] Failed to archive bot reply:", e);
	}
}

// Intercept outgoing sendMessage and editMessageText API calls to save/update the bot's own replies in SQLite history.
bot.api.config.use(async (prev, method, payload, signal) => {
	const result = await prev(method, payload, signal);
	archiveOutgoingMessage(method, payload, result);
	return result;
});

export let botUsername = "";

/**
 * Helper to run an async operation while showing a "typing" indicator to users.
 */
export async function withTyping(ctx: Context, action: () => Promise<void>) {
	try {
		await ctx.replyWithChatAction("typing");
	} catch {
		// Ignore error if chat action fails
	}

	// Keep sending typing action every 4 seconds since Telegram times it out after 5s
	const interval = setInterval(() => {
		ctx.replyWithChatAction("typing").catch(() => {});
	}, 4000);

	try {
		await action();
	} finally {
		clearInterval(interval);
	}
}

const leavingChats = new Set<string>();

async function handlePrivateChatAuth(
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

function extractPhotoFileId(
	photo?: NonNullable<Context["message"]>["photo"],
): string | undefined {
	if (!photo || photo.length === 0) return undefined;
	return photo[photo.length - 1].file_id;
}

function triggerPeriodicRetentionCleanup(chatIdStr: string): void {
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

function checkBotWritePermission(
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

/**
 * Initializes and configures the bot.
 */
async function initBot() {
	logger.info("Fetching bot metadata...");
	const me = await bot.api.getMe();
	botUsername = me.username;
	logger.info(`Bot initialized as @${botUsername}`);

	// 1. Seed initially allowed chats from config/env
	Repository.initSeedAllowedChats(CONFIG.ALLOWED_CHAT_IDS);

	// 2. Middleware: Whitelist Checker & Title Syncer
	bot.use(async (ctx, next) => {
		const chat = ctx.chat;
		if (!chat) return await next();

		const chatIdStr = chat.id.toString();
		const from = ctx.from;

		// Calculate friendly title
		const chatTitle =
			chat.type === "private"
				? from?.first_name
					? `${from.first_name}${from.last_name ? ` ${from.last_name}` : ""}${from.username ? ` (@${from.username})` : ""}`
					: "Private Chat"
				: chat.title || `Group (${chatIdStr})`;

		if (chat.type === "private") {
			const allowed = await handlePrivateChatAuth(ctx, chatIdStr);
			if (allowed) {
				Repository.upsertChat(chatIdStr, chatTitle, true);
				return await next();
			}
			return;
		}

		const dbChat = Repository.getChat(chatIdStr);
		const isAllowed = dbChat?.is_allowed === 1;

		if (!isAllowed) {
			await handleUnauthorizedGroup(ctx, chatIdStr, chat.title);
			return;
		}

		// Update title in db if available
		if (chat.title) {
			Repository.upsertChat(chatIdStr, chat.title, isAllowed);
		}

		await next();
	});

	// 3. Supergroup Migration Handler
	bot.on("message:migrate_to_chat_id", async (ctx) => {
		const oldChatId = ctx.chat.id.toString();
		const newChatId = ctx.message.migrate_to_chat_id.toString();

		logger.info(
			`[Migration] Group upgraded to supergroup. Migrating ${oldChatId} -> ${newChatId}`,
		);
		Repository.migrateChat(oldChatId, newChatId);
	});

	// 4. Middleware: Message Archiver & Background Topic Summarizer
	bot.on(
		["message:text", "message:photo", "message:voice"],
		async (ctx, next) => {
			const chat = ctx.chat;
			const msg = ctx.message;
			const from = ctx.from;

			if (!chat || !msg || !from) return await next();

			const chatIdStr = chat.id.toString();
			const textContent = msg.text || msg.caption || null;
			const photoFileId = extractPhotoFileId(msg.photo);
			const isSelf = from.is_bot && from.username === botUsername;

			Repository.saveMessage({
				chatId: chatIdStr,
				messageId: msg.message_id,
				userId: from.id,
				username: from.username || undefined,
				firstName: from.first_name,
				replyToMessageId: msg.reply_to_message?.message_id || undefined,
				text: textContent || undefined,
				photoFileId,
				isBotReply: isSelf,
				sentAt: msg.date,
			});

			if (!from.is_bot) {
				triggerPeriodicRetentionCleanup(chatIdStr);
			}

			await next();
		},
	);

	// 5. Permission Checker: Ensure bot can write, otherwise leave immediately
	bot.on("my_chat_member", async (ctx) => {
		const chat = ctx.chat;
		if (!chat || chat.type === "private") return;

		try {
			const fullChat = await ctx.getChat();
			const botMember = await ctx.getChatMember(ctx.me.id);

			if (botMember.status === "left" || botMember.status === "kicked") {
				return;
			}

			const canWrite = checkBotWritePermission(botMember, fullChat.permissions);

			if (!canWrite) {
				logger.warn(
					`[Security] Bot lacks write permissions in ${chat.title || "Group"} (${chat.id}). Leaving...`,
				);
				await ctx.leaveChat().catch(() => {});
			}
		} catch (e) {
			logger.error(
				"[Security] Error checking permissions on my_chat_member:",
				e,
			);
		}
	});

	registerCommandHandlers(bot);
	registerChatHandlers(bot);
	registerImageHandlers(bot);
	registerVoiceHandlers(bot);

	logger.info("All bot modules successfully registered.");
}

/**
 * Starts the bot in long polling mode.
 */
export async function startBot() {
	await initBot();
	logger.info("Bot long polling starting...");
	bot.start({
		onStart: () => {
			logger.info(
				"----------------------------------------------------------------",
			);
			logger.info(
				`Bot started successfully as @${botUsername} [Ready to receive updates]`,
			);
			logger.info(
				"----------------------------------------------------------------",
			);
		},
	});
}
