import type { Bot, Context } from "grammy";
import { mergeAgentEventHandlers } from "../agent/index";
import {
	createToolNotifier,
	deliverResponseWithArtifacts,
} from "../bot/ui/index";
import { CONFIG } from "../config";
import { Repository } from "../db/repository/index";
import { withChatLock, withTyping } from "../services/bot/index";
import {
	prepareDocumentContext,
	stageDocumentInWorkspace,
} from "../services/gemini/documentPerception";
import { checkAndRunBackgroundMemoryExtraction } from "../services/gemini/memoryWorker";
import { type GeneratedMediaArtifact, LlmService } from "../services/llm/index";
import { isDirectMediaInteraction } from "../services/mediaHelper";
import logger from "../utils/logger";
import {
	downloadTelegramFile,
	isDownloadError,
} from "../utils/mediaDownloader";

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
			LlmService.ensureTopicSummary(chatIdStr, chatSettings.current_topic),
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

		const reply = await LlmService.generateReply({
			history,
			topicSummary: activeTopic,
			chatId: chatIdStr,
			media: docContext.mediaPayload,
			document: docContext,
			targetMessage,
			onEvent: mergeAgentEventHandlers(notifier.onEvent, (event) => {
				if (event.type === "media-generated") {
					generatedArtifacts.push(...event.media);
				}
			}),
		});

		await deliverResponseWithArtifacts(
			ctx,
			reply,
			generatedArtifacts,
			notifier,
			msg.message_id,
		);

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

async function processDocumentMessage(
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

		if (!isDirectMediaInteraction(ctx, "Document")) {
			return;
		}

		const chatIdStr = ctx.chat.id.toString();
		await processDocumentMessage(ctx, chatIdStr);
	});
}
