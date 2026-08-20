import type { Bot, Context } from "grammy";
import { CONFIG } from "../config";
import { Repository } from "../db/repository";
import { botUsername, withChatLock, withTyping } from "../services/bot";
import { GeminiService } from "../services/gemini/index";
import { checkAndRunBackgroundMemoryExtraction } from "../services/gemini/memoryWorker";
import { isConversationFollowUp } from "../utils/conversation";
import logger from "../utils/logger";
import { sendLongMessage } from "../utils/message";

const COOLDOWN_SECONDS = 300; // 5 minutes cooldown between random replies

async function generateAndSendReply(
	ctx: Context,
	chatIdStr: string,
	isSpontaneous: boolean,
	replyToMessageId?: number,
): Promise<void> {
	const chatSettings = Repository.getChat(chatIdStr);
	if (!chatSettings) return;

	const activeTopic = await GeminiService.ensureTopicSummary(
		chatIdStr,
		chatSettings.current_topic,
	);
	const history = Repository.getRecentMessages(
		chatIdStr,
		CONFIG.CHAT_HISTORY_LIMIT,
	);

	let statusMessageId: number | undefined;
	const logPrefix = isSpontaneous ? "[Spontaneous]" : "[Chat]";

	const reply = await GeminiService.generateReply(
		history,
		activeTopic,
		isSpontaneous,
		async (toolName) => {
			if (!statusMessageId) {
				const statusMsgText =
					toolName === "web_search"
						? CONFIG.MESSAGES.tool_status_web_search ||
							`Spawning Subagent for (${toolName})...`
						: `Spawning Subagent for (${toolName})...`;

				logger.info(
					`${logPrefix} Sending tool status notification: "${statusMsgText}"`,
				);

				const sentMsg = await ctx
					.reply(statusMsgText, {
						...(replyToMessageId
							? { reply_to_message_id: replyToMessageId }
							: {}),
					})
					.catch((e) => {
						logger.warn(`${logPrefix} Failed to send status message:`, e);
						return null;
					});

				if (sentMsg) {
					statusMessageId = sentMsg.message_id;
				}
			}
		},
	);

	// Send final reply
	await sendLongMessage(ctx, reply, {
		...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
	});

	// Delete the temporary status message after final answer is sent
	if (statusMessageId && ctx.chat) {
		await ctx.api.deleteMessage(ctx.chat.id, statusMessageId).catch((e) => {
			logger.warn(`${logPrefix} Failed to delete status message:`, e);
		});
	}
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
		const chatIdStr = chat.id.toString();

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});

		// 1. Check if it's a mention, nickname match, reply, or quick follow-up
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

		const isDirectInteraction =
			isMentioned ||
			isReplyToBot ||
			isPrivateChat ||
			containsNickname ||
			isFollowUp;

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

		// 2. Check if we should trigger spontaneous participation
		// Only roll for spontaneous reply if the message is from a real user
		if (from.is_bot) return;

		const now = Math.floor(Date.now() / 1000);
		const lastRandomReply = chatSettings.last_random_reply_at || 0;
		const isCooldownOver = now - lastRandomReply >= COOLDOWN_SECONDS;

		if (isCooldownOver) {
			const roll = Math.random();
			if (roll < chatSettings.reply_probability) {
				logger.info(
					`[Spontaneous] Rolling SUCCESS for chat ${chatIdStr} (Roll: ${roll.toFixed(4)} < ${chatSettings.reply_probability})`,
				);

				// Update last random reply timestamp before processing to prevent double triggers
				Repository.updateChatSettings(chatIdStr, {
					last_random_reply_at: now,
				});

				await withChatLock(chatIdStr, () =>
					withTyping(ctx, () => generateAndSendReply(ctx, chatIdStr, true)),
				);
			}
		}
	});
}
