import { type Context, Bot as GrammyBot } from "grammy";
import { CONFIG } from "../config/index";
import { db } from "../db/index";
import { Repository } from "../db/repository";
import { registerChatHandlers } from "../modules/chat";
import { registerCommandHandlers } from "../modules/commands";
import { registerImageHandlers } from "../modules/image";
import { registerVoiceHandlers } from "../modules/voice";
import logger from "../utils/logger";
import {
	downloadTelegramFileById,
	extractPhotoFileId,
	getAudioMimeType,
	isDownloadError,
} from "../utils/mediaDownloader";
import { extractTelegramChatTitle } from "../utils/message";
import { describeImage, transcribeAudio } from "./gemini/mediaPerception";
import { checkAndRunBackgroundMemoryExtraction } from "./gemini/memoryWorker";

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

function isPlaceholderChatTitle(title?: string | null): boolean {
	return (
		!title ||
		title.trim() === "" ||
		title === "Whitelisted Chat" ||
		title === "Seeded Group" ||
		title.startsWith("Group (-")
	);
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
async function syncChatTitles(): Promise<void> {
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

function formatChatFriendlyTitle(
	chat: NonNullable<Context["chat"]>,
	from?: Context["from"],
): string {
	if (chat.type === "private") {
		const name = from ? extractTelegramChatTitle(from) : "";
		return name || "Private Chat";
	}
	return chat.title || `Group (${chat.id.toString()})`;
}

async function handleGroupAuth(
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

async function processBackgroundVoice(
	ctx: Context,
	chatIdStr: string,
	messageId: number,
	fileId: string,
	mimeType?: string,
): Promise<void> {
	try {
		const downloadResult = await downloadTelegramFileById(ctx, fileId, "voice");
		if (isDownloadError(downloadResult)) {
			logger.warn(
				`[Multimodal Perception] Could not download voice message ${messageId} in chat ${chatIdStr}: ${downloadResult.error}`,
			);
			return;
		}

		const resolvedMime = getAudioMimeType(downloadResult.filePath, mimeType);
		const transcription = await transcribeAudio(
			downloadResult.buffer,
			resolvedMime,
		);

		const updatedText = transcription.trim()
			? `[Ses Kaydı]: ${transcription.trim()}`
			: `[Ses Kaydı: (Sessiz / Konuşma Yok)]`;

		Repository.updateMessageText(chatIdStr, messageId, updatedText);
		logger.info(
			`[Multimodal Perception] Voice transcribed for msg ${messageId} in chat ${chatIdStr}: "${updatedText}"`,
		);

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});
	} catch (err) {
		logger.error(
			`[Multimodal Perception] Error processing background voice for msg ${messageId}:`,
			err,
		);
	}
}

async function processBackgroundPhoto(
	ctx: Context,
	chatIdStr: string,
	messageId: number,
	fileId: string,
	caption?: string,
): Promise<void> {
	try {
		const downloadResult = await downloadTelegramFileById(ctx, fileId, "photo");
		if (isDownloadError(downloadResult)) {
			logger.warn(
				`[Multimodal Perception] Could not download photo message ${messageId} in chat ${chatIdStr}: ${downloadResult.error}`,
			);
			return;
		}

		const description = await describeImage(
			downloadResult.buffer,
			"image/jpeg",
			caption,
		);

		let updatedText = "";
		if (description.trim()) {
			updatedText = caption?.trim()
				? `[Görsel - "${caption.trim()}"]: ${description.trim()}`
				: `[Görsel]: ${description.trim()}`;
		} else if (caption?.trim()) {
			updatedText = `[Görsel]: ${caption.trim()}`;
		} else {
			updatedText = `[Görsel]`;
		}

		Repository.updateMessageText(chatIdStr, messageId, updatedText);
		logger.info(
			`[Multimodal Perception] Photo described for msg ${messageId} in chat ${chatIdStr}: "${updatedText}"`,
		);

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});
	} catch (err) {
		logger.error(
			`[Multimodal Perception] Error processing background photo for msg ${messageId}:`,
			err,
		);
	}
}

interface ExtractedMediaInfo {
	textContent: string;
	photoFileId?: string;
	voiceFileId?: string;
	voiceMimeType?: string;
	initialText?: string;
}

function extractMessageMediaInfo(msg?: Context["message"]): ExtractedMediaInfo {
	if (!msg) return { textContent: "" };

	const textContent = msg.text || msg.caption || "";
	const photoFileId =
		extractPhotoFileId(msg.photo) ||
		(msg.document?.mime_type?.startsWith("image/")
			? msg.document.file_id
			: undefined);
	const voiceFileId = msg.voice?.file_id || msg.audio?.file_id;
	const voiceMimeType = msg.voice?.mime_type || msg.audio?.mime_type;

	let initialText: string | undefined = textContent || undefined;
	if (!initialText) {
		if (photoFileId) initialText = "[Görsel]";
		else if (voiceFileId) initialText = "[Ses Kaydı]";
	}

	return {
		textContent,
		photoFileId,
		voiceFileId,
		voiceMimeType,
		initialText,
	};
}

function triggerBackgroundMediaPerception(
	ctx: Context,
	chatIdStr: string,
	messageId: number,
	mediaInfo: ExtractedMediaInfo,
): void {
	if (mediaInfo.voiceFileId) {
		processBackgroundVoice(
			ctx,
			chatIdStr,
			messageId,
			mediaInfo.voiceFileId,
			mediaInfo.voiceMimeType,
		).catch((err) => {
			logger.error(
				`[Multimodal Perception] Voice background task error in chat ${chatIdStr}:`,
				err,
			);
		});
	} else if (mediaInfo.photoFileId) {
		processBackgroundPhoto(
			ctx,
			chatIdStr,
			messageId,
			mediaInfo.photoFileId,
			mediaInfo.textContent || undefined,
		).catch((err) => {
			logger.error(
				`[Multimodal Perception] Photo background task error in chat ${chatIdStr}:`,
				err,
			);
		});
	}
}

/**
 * Initializes and configures the bot.
 */
async function initBot() {
	logger.info("Fetching bot metadata...");
	const me = await bot.api.getMe();
	botUsername = me.username;
	logger.info(`Bot initialized as @${botUsername}`);

	// 1. Seed initially allowed chats from config/env and sync titles
	Repository.initSeedAllowedChats(CONFIG.ALLOWED_CHAT_IDS);
	void syncChatTitles();

	// 2. Middleware: Whitelist Checker & Title Syncer
	bot.use(async (ctx, next) => {
		const chat = ctx.chat;
		if (!chat) return await next();

		const chatIdStr = chat.id.toString();
		const friendlyTitle = formatChatFriendlyTitle(chat, ctx.from);

		if (chat.type === "private") {
			const allowed = await handlePrivateChatAuth(ctx, chatIdStr);
			if (allowed) {
				Repository.upsertChat(chatIdStr, friendlyTitle, true);
				return await next();
			}
			return;
		}

		const isGroupAllowed = await handleGroupAuth(ctx, chatIdStr, chat.title);
		if (isGroupAllowed) {
			await next();
		}
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
		[
			"message:text",
			"message:photo",
			"message:voice",
			"message:audio",
			"message:document",
		],
		async (ctx, next) => {
			const chat = ctx.chat;
			const msg = ctx.message;
			const from = ctx.from;

			if (!chat || !msg || !from) return await next();

			const chatIdStr = chat.id.toString();
			const mediaInfo = extractMessageMediaInfo(msg);
			const isSelf = from.is_bot && from.username === botUsername;

			Repository.saveMessage({
				chatId: chatIdStr,
				messageId: msg.message_id,
				userId: from.id,
				username: from.username || undefined,
				firstName: from.first_name,
				replyToMessageId: msg.reply_to_message?.message_id || undefined,
				text: mediaInfo.initialText,
				photoFileId: mediaInfo.photoFileId,
				isBotReply: isSelf,
				sentAt: msg.date,
			});

			if (!from.is_bot) {
				triggerPeriodicRetentionCleanup(chatIdStr);
			}

			triggerBackgroundMediaPerception(
				ctx,
				chatIdStr,
				msg.message_id,
				mediaInfo,
			);

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
