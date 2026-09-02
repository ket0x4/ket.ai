import type { Bot, Context } from "grammy";
import { createToolNotifier, sendSingleArtifact } from "../bot/ui";
import { CONFIG } from "../config";
import { Repository } from "../db/repository";
import { botUsername, withChatLock, withTyping } from "../services/bot";
import {
	type PreparedDocumentContext,
	prepareDocumentContext,
	sanitizeDocumentFilename,
	stageDocumentInWorkspace,
} from "../services/gemini/documentPerception";
import {
	GeminiService,
	type GeneratedMediaArtifact,
	type ReplyContextInfo,
	type TargetMessageInfo,
} from "../services/gemini/index";
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

async function resolveRepliedDocument(
	ctx: Context,
	chatIdStr: string,
): Promise<PreparedDocumentContext | undefined> {
	const replyToMsg = ctx.message?.reply_to_message;
	if (!replyToMsg) return undefined;

	let docFileId = replyToMsg.document?.file_id;
	let docFileName = replyToMsg.document?.file_name;
	let docMimeType = replyToMsg.document?.mime_type;

	if (!docFileId && replyToMsg.message_id) {
		const dbMsg = Repository.getMessage(chatIdStr, replyToMsg.message_id);
		if (dbMsg?.document_file_id) {
			docFileId = dbMsg.document_file_id;
			docFileName = dbMsg.document_file_name || undefined;
			docMimeType = dbMsg.document_mime_type || undefined;
		}
	}

	if (!docFileId) return undefined;

	const cleanName = sanitizeDocumentFilename(docFileName || "document.bin");
	logger.info(
		`[Chat] Reply to document message detected (${cleanName}, file_id: ${docFileId}). Downloading...`,
	);

	try {
		const downloadResult = await downloadTelegramFileById(
			ctx,
			docFileId,
			"document",
		);
		if (!isDownloadError(downloadResult)) {
			const docContext = prepareDocumentContext(
				downloadResult.buffer,
				cleanName,
				docMimeType,
			);
			// Automatically stage into chat sandbox workspace
			await stageDocumentInWorkspace(
				chatIdStr,
				docContext.fileName,
				downloadResult.buffer,
				docContext.isText,
			).catch((e) => {
				logger.warn(`[Chat] Failed to stage replied document in workspace:`, e);
			});
			return docContext;
		}
		logger.warn(
			`[Chat] Failed to download replied document: ${downloadResult.error}`,
		);
	} catch (err) {
		logger.error("[Chat] Error downloading replied document:", err);
	}
	return undefined;
}

function extractReplyMessageText(
	replyToMsg: NonNullable<NonNullable<Context["message"]>["reply_to_message"]>,
	chatIdStr: string,
): string {
	if (replyToMsg.text) return replyToMsg.text;
	if (replyToMsg.caption) return replyToMsg.caption;
	if (replyToMsg.photo) return "[Photo]";
	if (replyToMsg.document) {
		return `[Document: ${replyToMsg.document.file_name || "file"}]`;
	}
	if (replyToMsg.voice) return "[Voice]";

	const dbMsg = Repository.getMessageWithUser(chatIdStr, replyToMsg.message_id);
	if (dbMsg?.text) return dbMsg.text;

	return "[Media]";
}

export function resolveReplyContext(
	ctx: Context,
	chatIdStr: string,
): ReplyContextInfo | undefined {
	const replyToMsg = ctx.message?.reply_to_message;
	if (!replyToMsg) return undefined;

	const replyMsgId = replyToMsg.message_id;
	const from = replyToMsg.from;
	const isBot = Boolean(
		from?.is_bot || (from?.username && from.username === botUsername),
	);
	const senderName = isBot ? "You (ket.ai)" : from?.first_name || "User";
	const senderUsername = from?.username || undefined;
	const text = extractReplyMessageText(replyToMsg, chatIdStr);

	return {
		messageId: replyMsgId,
		senderId: from?.id,
		senderName,
		senderUsername,
		isBot,
		text,
	};
}

// Re-export presentation UI helpers from src/bot/ui for backward compatibility
export { createToolNotifier, sendSingleArtifact };

async function generateAndSendReply(
	ctx: Context,
	chatIdStr: string,
	isSpontaneous: boolean,
	replyToMessageId?: number,
	targetMessage?: TargetMessageInfo,
): Promise<void> {
	const chatSettings = Repository.getChat(chatIdStr);
	if (!chatSettings) return;

	// Concurrency: fetch active topic, history, replied photo, and replied document in parallel
	const [activeTopic, history, mediaPayload, documentPayload] =
		await Promise.all([
			GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic),
			Promise.resolve(
				Repository.getRecentMessages(chatIdStr, CONFIG.CHAT_HISTORY_LIMIT),
			),
			resolveRepliedPhoto(ctx, chatIdStr),
			resolveRepliedDocument(ctx, chatIdStr),
		]);

	const logPrefix = isSpontaneous ? "[Spontaneous]" : "[Chat]";
	const notifier = createToolNotifier(ctx, replyToMessageId, logPrefix);
	const generatedArtifacts: GeneratedMediaArtifact[] = [];

	const reply = await GeminiService.generateReply(
		history,
		activeTopic,
		isSpontaneous,
		notifier.onToolCall,
		chatIdStr,
		mediaPayload,
		async (media) => {
			generatedArtifacts.push(...media);
		},
		notifier.onToolProgress,
		documentPayload,
		targetMessage,
	);

	// Send generated artifacts (Photos, Spreadsheets, PDF reports, Videos, Audio)
	for (const art of generatedArtifacts) {
		await sendSingleArtifact(ctx, art, replyToMessageId);
	}

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
	const botName = botUsername || "ket";
	const nicknameRegex = new RegExp(
		`\\b${botName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
		"i",
	);
	const containsNickname = nicknameRegex.test(text) || /\bket\b/i.test(text);
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
			const targetMessage: TargetMessageInfo = {
				messageId: msg.message_id,
				userId: from.id,
				userName: from.first_name || "User",
				userUsername: from.username || undefined,
				text: msg.text || "",
				sentAt: msg.date,
				replyTo: resolveReplyContext(ctx, chatIdStr),
			};

			// Direct interaction: reply immediately, serialized per chat
			await withChatLock(chatIdStr, () =>
				withTyping(ctx, () =>
					generateAndSendReply(
						ctx,
						chatIdStr,
						false,
						msg.message_id,
						targetMessage,
					),
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
