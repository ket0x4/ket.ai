import type { Bot, Context } from "grammy";
import { CONFIG } from "../config";
import { Repository } from "../db/repository";
import { botUsername, withChatLock, withTyping } from "../services/bot";
import { GeminiService } from "../services/gemini/index";
import { checkAndRunBackgroundMemoryExtraction } from "../services/gemini/memoryWorker";
import { isConversationFollowUp } from "../utils/conversation";
import logger from "../utils/logger";
import {
	downloadTelegramFileById,
	extractPhotoFileId,
	isDownloadError,
} from "../utils/mediaDownloader";
import { sendLongMessage } from "../utils/message";

const COOLDOWN_SECONDS = 300; // 5 minutes cooldown between random replies

async function resolveRepliedPhoto(
	ctx: Context,
	chatIdStr: string,
): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
	const replyToMsg = ctx.message?.reply_to_message;
	if (!replyToMsg) return undefined;

	let photoFileId = extractPhotoFileId(replyToMsg.photo);
	if (!photoFileId && replyToMsg.document?.mime_type?.startsWith("image/")) {
		photoFileId = replyToMsg.document.file_id;
	}
	if (!photoFileId && replyToMsg.message_id) {
		const dbMsg = Repository.getMessage(chatIdStr, replyToMsg.message_id);
		if (dbMsg?.photo_file_id) {
			photoFileId = dbMsg.photo_file_id;
		}
	}

	if (!photoFileId) return undefined;

	logger.info(
		`[Chat] Reply to photo message detected (file_id: ${photoFileId}). Downloading image...`,
	);
	try {
		const downloadResult = await downloadTelegramFileById(
			ctx,
			photoFileId,
			"photo",
		);
		if (!isDownloadError(downloadResult)) {
			logger.info(
				`[Chat] Successfully downloaded replied photo (${downloadResult.buffer.length} bytes)`,
			);
			return {
				buffer: downloadResult.buffer,
				mimeType: "image/jpeg",
			};
		}
		logger.warn(
			`[Chat] Failed to download replied photo: ${downloadResult.error}`,
		);
	} catch (err) {
		logger.error("[Chat] Error downloading replied photo:", err);
	}
	return undefined;
}

function resolveToolStatusMessage(
	toolName: string,
	args: Record<string, unknown> = {},
): string {
	if (toolName === "web_search") {
		return CONFIG.MESSAGES.tool_status_web_search || "🔍 Searching the web...";
	}

	if (toolName === "execute_code") {
		const packages = Array.isArray(args.packages)
			? (args.packages as string[])
			: [];
		const lang = typeof args.language === "string" ? args.language : "script";
		if (packages.length > 0) {
			const pkgList = packages.slice(0, 3).join(", ");
			const suffix = packages.length > 3 ? "..." : "";
			return `📦 Installing dependencies (${pkgList}${suffix}) & running ${lang} script in sandbox...`;
		}
		return `⚡ Executing ${lang} script in sandbox...`;
	}

	return `Spawning subagent for (${toolName})...`;
}

function createToolNotifier(
	ctx: Context,
	replyToMessageId?: number,
	logPrefix: string = "[Chat]",
) {
	let statusMessageId: number | undefined;

	return {
		onToolCall: async (
			toolName: string,
			args: Record<string, unknown> = {},
			_step?: number,
		) => {
			const statusMsgText = resolveToolStatusMessage(toolName, args);

			if (statusMessageId && ctx.chat) {
				logger.info(
					`${logPrefix} Updating tool status notification: "${statusMsgText}"`,
				);
				await ctx.api
					.editMessageText(ctx.chat.id, statusMessageId, statusMsgText)
					.catch((e) => {
						logger.debug(`${logPrefix} Failed to edit status message:`, e);
					});
				return;
			}

			logger.info(
				`${logPrefix} Sending tool status notification: "${statusMsgText}"`,
			);

			const sentMsg = await ctx
				.reply(
					statusMsgText,
					replyToMessageId
						? { reply_to_message_id: replyToMessageId }
						: undefined,
				)
				.catch((e) => {
					logger.warn(`${logPrefix} Failed to send status message:`, e);
					return null;
				});

			if (sentMsg) {
				statusMessageId = sentMsg.message_id;
			}
		},
		cleanup: async () => {
			if (statusMessageId && ctx.chat) {
				await ctx.api.deleteMessage(ctx.chat.id, statusMessageId).catch((e) => {
					logger.warn(`${logPrefix} Failed to delete status message:`, e);
				});
			}
		},
	};
}

async function generateAndSendReply(
	ctx: Context,
	chatIdStr: string,
	isSpontaneous: boolean,
	replyToMessageId?: number,
): Promise<void> {
	const chatSettings = Repository.getChat(chatIdStr);
	if (!chatSettings) return;

	// Concurrency: fetch active topic, history, and replied photo in parallel
	const [activeTopic, history, mediaPayload] = await Promise.all([
		GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic),
		Promise.resolve(
			Repository.getRecentMessages(chatIdStr, CONFIG.CHAT_HISTORY_LIMIT),
		),
		resolveRepliedPhoto(ctx, chatIdStr),
	]);

	const logPrefix = isSpontaneous ? "[Spontaneous]" : "[Chat]";
	const notifier = createToolNotifier(ctx, replyToMessageId, logPrefix);

	const reply = await GeminiService.generateReply(
		history,
		activeTopic,
		isSpontaneous,
		notifier.onToolCall,
		chatIdStr,
		mediaPayload,
	);

	// Send final reply
	await sendLongMessage(
		ctx,
		reply,
		replyToMessageId ? { reply_to_message_id: replyToMessageId } : undefined,
	);

	// Delete the temporary status message after final answer is sent
	await notifier.cleanup();
}

function checkDirectInteraction(
	text: string,
	msg: NonNullable<Context["message"]>,
	from: NonNullable<Context["from"]>,
	chat: NonNullable<Context["chat"]>,
	chatIdStr: string,
): boolean {
	const containsNickname = /\bket\b/i.test(text);
	const isMentioned = text.includes(`@${botUsername}`);
	const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
	const isPrivateChat = chat.type === "private";

	const isFollowUp = isConversationFollowUp(chatIdStr, from.id, msg.date);
	if (isFollowUp) {
		logger.debug(
			`[Conversation] Follow-up detected for user ${from.first_name} in chat ${chatIdStr}`,
		);
	}

	return (
		isMentioned ||
		isReplyToBot ||
		isPrivateChat ||
		containsNickname ||
		isFollowUp
	);
}

async function trySpontaneousReply(
	ctx: Context,
	chatIdStr: string,
	chatSettings: NonNullable<ReturnType<typeof Repository.getChat>>,
): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	const lastRandomReply = chatSettings.last_random_reply_at || 0;
	if (now - lastRandomReply < COOLDOWN_SECONDS) return;

	const roll = Math.random();
	if (roll >= chatSettings.reply_probability) return;

	logger.info(
		`[Spontaneous] Rolling SUCCESS for chat ${chatIdStr} (Roll: ${roll.toFixed(4)} < ${chatSettings.reply_probability})`,
	);

	Repository.updateChatSettings(chatIdStr, {
		last_random_reply_at: now,
	});

	await withChatLock(chatIdStr, () =>
		withTyping(ctx, () => generateAndSendReply(ctx, chatIdStr, true)),
	);
}

export function registerChatHandlers(bot: Bot) {
	// Listen to all text messages (non-commands)
	bot.on("message:text", async (ctx) => {
		const text = ctx.message.text;

		// Ignore commands (starts with '/')
		if (text.startsWith("/")) return;

		const chat = ctx.chat;
		const msg = ctx.message;
		const from = ctx.from;
		if (!chat || !msg || !from) return;

		const chatIdStr = chat.id.toString();

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});

		const isDirectInteraction = checkDirectInteraction(
			text,
			msg,
			from,
			chat,
			chatIdStr,
		);

		// Get chat configuration
		const chatSettings = Repository.getChat(chatIdStr);
		if (!chatSettings) return;

		if (isDirectInteraction) {
			// Direct interaction: reply immediately, serialized per chat
			await withChatLock(chatIdStr, () =>
				withTyping(ctx, () =>
					generateAndSendReply(ctx, chatIdStr, false, msg.message_id),
				),
			);
			return;
		}

		// Check if we should trigger spontaneous participation (real users only)
		if (!from.is_bot) {
			await trySpontaneousReply(ctx, chatIdStr, chatSettings);
		}
	});
}
