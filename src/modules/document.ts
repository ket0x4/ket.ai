import type { Bot, Context } from "grammy";
import { createToolNotifier, sendSingleArtifact } from "../bot/ui";
import { CONFIG } from "../config";
import { Repository } from "../db/repository";
import { botUsername, withChatLock, withTyping } from "../services/bot";
import {
	prepareDocumentContext,
	stageDocumentInWorkspace,
} from "../services/gemini/documentPerception";
import {
	GeminiService,
	type GeneratedMediaArtifact,
} from "../services/gemini/index";
import { checkAndRunBackgroundMemoryExtraction } from "../services/gemini/memoryWorker";
import { isDirectMediaInteraction } from "../services/mediaHelper";
import logger from "../utils/logger";
import {
	downloadTelegramFile,
	isDownloadError,
} from "../utils/mediaDownloader";
import { sendLongMessage } from "../utils/message";

async function executeDocumentReplyWorkflow(
	ctx: Context,
	chatIdStr: string,
	chatSettings: NonNullable<ReturnType<typeof Repository.getChat>>,
	msg: NonNullable<Context["message"]>,
	doc: NonNullable<NonNullable<Context["message"]>["document"]>,
): Promise<void> {
	const notifier = createToolNotifier(ctx, msg.message_id, "[Document]");
	try {
		logger.info(
			`[Document] Downloading document '${doc.file_name || "file"}' (${doc.file_size || 0} bytes) in chat ${chatIdStr}...`,
		);

		const downloadResult = await downloadTelegramFile(ctx, "document");
		if (isDownloadError(downloadResult)) {
			await ctx.reply(downloadResult.error, {
				reply_to_message_id: msg.message_id,
			});
			return;
		}

		const docContext = prepareDocumentContext(
			downloadResult.buffer,
			doc.file_name || "document.bin",
			doc.mime_type,
		);

		// Automatically stage file into persistent session workspace for code execution or inspection
		await stageDocumentInWorkspace(
			chatIdStr,
			docContext.fileName,
			downloadResult.buffer,
			docContext.isText,
		).catch((stageErr) => {
			logger.warn(
				`[Document] Error staging '${docContext.fileName}' in workspace:`,
				stageErr,
			);
		});

		const [activeTopic, history] = await Promise.all([
			GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic),
			Promise.resolve(
				Repository.getRecentMessages(chatIdStr, CONFIG.CHAT_HISTORY_LIMIT),
			),
		]);

		const generatedArtifacts: GeneratedMediaArtifact[] = [];

		const targetMessage = {
			messageId: msg.message_id,
			userId: ctx.from?.id || 0,
			userName: ctx.from?.first_name || "User",
			userUsername: ctx.from?.username || undefined,
			text: msg.caption || `[Document: ${doc.file_name || "file"}]`,
			sentAt: msg.date,
		};

		const reply = await GeminiService.generateReply(
			history,
			activeTopic,
			false,
			notifier.onToolCall,
			chatIdStr,
			docContext.mediaPayload,
			async (media) => {
				generatedArtifacts.push(...media);
			},
			notifier.onToolProgress,
			docContext,
			targetMessage,
		);

		// Send generated media artifacts (plots, edited files, audio, video)
		for (const art of generatedArtifacts) {
			await sendSingleArtifact(ctx, art, msg.message_id);
		}

		// Send final text reply
		await sendLongMessage(ctx, reply, {
			reply_to_message_id: msg.message_id,
		});

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});
	} catch (err) {
		logger.error(
			`[Document] Error processing document message ${msg.message_id}:`,
			err,
		);
		await ctx.reply(
			"I ran into an issue while analyzing the document, please try again.",
			{ reply_to_message_id: msg.message_id },
		);
	} finally {
		await notifier.cleanup();
	}
}

export async function processDocumentMessage(
	ctx: Context,
	chatIdStr: string,
): Promise<void> {
	const msg = ctx.message;
	const doc = msg?.document;
	if (!msg || !doc) return;

	const chatSettings = Repository.getChat(chatIdStr);
	if (!chatSettings) return;

	await withChatLock(chatIdStr, () =>
		withTyping(ctx, () =>
			executeDocumentReplyWorkflow(ctx, chatIdStr, chatSettings, msg, doc),
		),
	);
}

export function registerDocumentHandlers(bot: Bot) {
	bot.on("message:document", async (ctx) => {
		const doc = ctx.message.document;
		if (!doc) return;

		const caption = ctx.message.caption || "";
		const botName = botUsername || "ket";
		const nicknameRegex = new RegExp(
			`\\b${botName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
			"i",
		);
		const containsNickname =
			nicknameRegex.test(caption) || /\bket\b/i.test(caption);
		const isMentioned = Boolean(
			botUsername && caption.includes(`@${botUsername}`),
		);

		const isDirect = isDirectMediaInteraction(
			ctx,
			"Document",
			containsNickname || isMentioned,
		);

		if (!isDirect) {
			return;
		}

		const chatIdStr = ctx.chat.id.toString();
		await processDocumentMessage(ctx, chatIdStr);
	});
}
