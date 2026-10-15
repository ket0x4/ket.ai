import { type RunnerHandle, run } from "@grammyjs/runner";
import { CONFIG } from "../../config/index";
import { Repository } from "../../db/repository";
import { registerChatHandlers } from "../../modules/chat";
import { registerCommandHandlers } from "../../modules/commands";
import { registerDocumentHandlers } from "../../modules/document";
import { registerImageHandlers } from "../../modules/image";
import { registerVoiceHandlers } from "../../modules/voice";
import logger from "../../utils/logger";
import {
	checkBotWritePermission,
	formatChatFriendlyTitle,
	handleGroupAuth,
	handlePrivateChatAuth,
	syncChatTitles,
	triggerPeriodicRetentionCleanup,
} from "./auth";
import { bot, botUsername, setBotUsername } from "./instance";
import {
	extractMessageMediaInfo,
	triggerBackgroundMediaPerception,
} from "./mediaPerception";
import { installOutgoingArchiveInterceptor } from "./outgoingArchive";
import { checkRateLimit } from "./rateLimit";

export { withChatLock } from "./concurrency";
export {
	extractOutgoingPayload,
	isTransientStatusMessage,
	saveOutgoingMessage,
} from "./outgoingArchive";
export { withTyping } from "./typing";
// Public API re-exports (preserves the original `services/bot` surface).
export { bot, botUsername };

// Sync outgoing Telegram API calls into SQLite as soon as the bot module loads.
installOutgoingArchiveInterceptor(bot);

// Handle to the concurrent long-polling runner, retained for graceful shutdown.
let runner: RunnerHandle | null = null;

// Opt-in/opt-out commands are the only interactions still processed for opted-out users.
const OPT_COMMAND_REGEX =
	/^\/(?:optin|opt_in|optout|opt_out)(?:@\w+)?(?:\s|$)/i;

function isOptCommandText(text: string): boolean {
	return OPT_COMMAND_REGEX.test(text.trim());
}

/**
 * Initializes and configures the bot.
 */
async function initBot() {
	logger.info("Fetching bot metadata...");
	const me = await bot.api.getMe();
	setBotUsername(me.username);
	logger.info(`Bot initialized as @${botUsername}`);

	// Global error handler so a single failing update never crashes the process.
	bot.catch((err) => {
		logger.error(
			`[Bot] Unhandled error while processing update ${err.ctx?.update.update_id}:`,
			err.error,
		);
	});

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

	// 2b. Middleware: Opt-Out User Guard (completely ignores opted-out users)
	// ponytail: Intercept at top-level middleware so opted-out users skip all message archiving,
	// media perception, and LLM handlers with zero DB overhead.
	bot.use(async (ctx, next) => {
		const from = ctx.from;
		if (!from || !Repository.isUserOptedOut(from.id)) {
			return await next();
		}

		// If user is opted-out, allow opt-in and opt-out commands through
		if (isOptCommandText(ctx.message?.text || ctx.message?.caption || "")) {
			return await next();
		}

		// Completely ignore all other messages, photos, voice notes, and interactions
		logger.debug(
			`[OptOut] Ignored interaction from opted-out user ${from.id} (${from.first_name}) in chat ${ctx.chat?.id}`,
		);
	});

	// 2c. Middleware: Per-user message rate limit (abuse / cost protection)
	bot.use(async (ctx, next) => {
		const from = ctx.from;
		if (!from) return await next();

		const limit = CONFIG.RATE_LIMIT_MESSAGES_PER_MINUTE;
		if (!checkRateLimit(`msg:${from.id}`, limit)) {
			logger.debug(
				`[RateLimit] Dropped message from user ${from.id} (${from.first_name}) in chat ${ctx.chat?.id}: exceeded ${limit}/min`,
			);
			return;
		}
		return await next();
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

			// Do not archive opt-in/opt-out commands or messages from opted-out users
			if (
				isOptCommandText(msg.text || msg.caption || "") ||
				Repository.isUserOptedOut(from.id)
			) {
				return await next();
			}

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
				documentFileId: mediaInfo.documentFileId,
				documentFileName: mediaInfo.documentFileName,
				documentMimeType: mediaInfo.documentMimeType,
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
	registerDocumentHandlers(bot);

	logger.info("All bot modules successfully registered.");
}

/**
 * Starts the bot in concurrent long-polling mode.
 *
 * Uses the official grammY runner so updates are processed concurrently instead
 * of one-at-a-time. This prevents a single slow generation from blocking every
 * other chat, makes `/stop` able to interrupt an in-flight reply, and gives the
 * per-chat lock (`withChatLock`) real work to do.
 */
export async function startBot() {
	await initBot();
	logger.info("Bot long polling starting...");

	runner = run(bot);

	logger.info(
		"----------------------------------------------------------------",
	);
	logger.info(
		`Bot started successfully as @${botUsername} [Ready to receive updates]`,
	);
	logger.info(
		"----------------------------------------------------------------",
	);
}

/**
 * Stops the concurrent runner and waits for in-flight updates to drain.
 */
export async function stopBot(): Promise<void> {
	if (!runner) {
		bot.stop();
		return;
	}
	try {
		await runner.stop();
		logger.info("Bot runner stopped.");
	} catch (error) {
		logger.error("Error stopping bot runner:", error);
	} finally {
		runner = null;
	}
}
