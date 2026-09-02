import type { Context } from "grammy";
import { CONFIG } from "../config/index";
import type { MessageRow } from "../db/repository";
import { Repository } from "../db/repository";
import { isConversationFollowUp } from "../utils/conversation";
import logger from "../utils/logger";
import {
	downloadTelegramFile,
	isDownloadError,
} from "../utils/mediaDownloader";
import { sendLongMessage } from "../utils/message";
import { botUsername, withChatLock, withTyping } from "./bot";
import { GeminiService, type TargetMessageInfo } from "./gemini/index";

interface MediaProcessorOptions {
	mediaType: "photo" | "voice";
	resolveMimeType: (downloaded: { filePath: string; buffer: Buffer }) => string;
	generateReply: (
		buffer: Buffer,
		mimeType: string,
		history: MessageRow[],
		activeTopic: string,
		targetMessage?: TargetMessageInfo,
	) => Promise<string>;
	fallbackErrorMessage: string;
}

export function isDirectMediaInteraction(
	ctx: Context,
	mediaTypeTag: string,
	extraCondition?: boolean,
): boolean {
	const msg = ctx.message;
	const chat = ctx.chat;
	if (!msg || !chat) return false;

	const chatIdStr = chat.id.toString();
	const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
	const isPrivateChat = chat.type === "private";

	const isFollowUp = ctx.from
		? isConversationFollowUp(chatIdStr, ctx.from.id, msg.date)
		: false;
	if (isFollowUp) {
		logger.debug(
			`[${mediaTypeTag}] Follow-up detected for user ${ctx.from?.first_name} in chat ${chatIdStr}`,
		);
	}

	return isReplyToBot || isPrivateChat || isFollowUp || Boolean(extraCondition);
}

export async function processMediaInteraction(
	ctx: Context,
	options: MediaProcessorOptions,
): Promise<void> {
	const msg = ctx.message;
	const chat = ctx.chat;
	if (!msg || !chat) return;

	const chatIdStr = chat.id.toString();
	const chatSettings = Repository.getChat(chatIdStr);
	if (!chatSettings) return;

	await withChatLock(chatIdStr, () =>
		withTyping(ctx, async () => {
			try {
				logger.info(
					`[${options.mediaType}] Downloading ${options.mediaType} from Telegram...`,
				);
				const downloadResult = await downloadTelegramFile(
					ctx,
					options.mediaType,
				);
				if (isDownloadError(downloadResult)) {
					await ctx.reply(downloadResult.error, {
						reply_to_message_id: msg.message_id,
					});
					return;
				}

				const mimeType = options.resolveMimeType(downloadResult);
				const activeTopic = await GeminiService.ensureTopicSummary(
					chatIdStr,
					chatSettings.current_topic,
				);
				const history = Repository.getRecentMessages(
					chatIdStr,
					CONFIG.IMAGE_HISTORY_LIMIT,
				);

				logger.info(
					`[${options.mediaType}] Sending ${options.mediaType} to Gemini for analysis...`,
				);
				const targetMessage: TargetMessageInfo = {
					messageId: msg.message_id,
					userId: ctx.from?.id || 0,
					userName: ctx.from?.first_name || "User",
					userUsername: ctx.from?.username || undefined,
					text: msg.caption || `[${options.mediaType}]`,
					sentAt: msg.date,
				};
				const reply = await options.generateReply(
					downloadResult.buffer,
					mimeType,
					history,
					activeTopic,
					targetMessage,
				);

				await sendLongMessage(ctx, reply, {
					reply_to_message_id: msg.message_id,
				});
			} catch (error) {
				logger.error(`Error processing ${options.mediaType}:`, error);
				await ctx.reply(options.fallbackErrorMessage, {
					reply_to_message_id: msg.message_id,
				});
			}
		}),
	);
}
