import { Bot } from "grammy";
import { CONFIG } from "../config/index";
import { botUsername, withTyping, withChatLock } from "../services/bot";
import { Repository } from "../db/repository";
import { GeminiService } from "../services/gemini/index";
import { isConversationFollowUp } from "../utils/conversation";
import { sendLongMessage } from "../utils/message";
import { downloadTelegramFile, isDownloadError } from "../utils/mediaDownloader";
import logger from "../utils/logger";

/**
 * Determines the audio MIME type from a Telegram voice file path.
 * Telegram voice messages are typically OGG/Opus (.oga),
 * but we handle other extensions as a safeguard.
 */
function getAudioMimeType(filePath: string): string {
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".wav")) return "audio/wav";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  // Default: Telegram voice messages use OGG/Opus (.oga)
  return "audio/ogg";
}

export function registerVoiceHandlers(bot: Bot) {
  // Listen to voice messages
  bot.on("message:voice", async (ctx) => {
    const msg = ctx.message;
    const chat = ctx.chat;
    const chatIdStr = chat.id.toString();

    // 1. Check if the bot is mentioned via reply or in private chat
    const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
    const isPrivateChat = chat.type === "private";

    // Detect quick conversation follow-up
    const isFollowUp = ctx.from
      ? isConversationFollowUp(chatIdStr, ctx.from.id, msg.date)
      : false;
    if (isFollowUp) {
      logger.debug(
        `[Voice] Follow-up voice detected for user ${ctx.from?.first_name} in chat ${chatIdStr}`
      );
    }

    const isDirectInteraction = isReplyToBot || isPrivateChat || isFollowUp;

    if (!isDirectInteraction) {
      // Not directed to the bot, just log and skip
      return;
    }

    const chatSettings = Repository.getChat(chatIdStr);
    if (!chatSettings) return;

    await withChatLock(chatIdStr, () =>
      withTyping(ctx, async () => {
        try {
          logger.info(`[Voice] Downloading voice message from Telegram...`);

          const downloadResult = await downloadTelegramFile(ctx, "voice");
          if (isDownloadError(downloadResult)) {
            await ctx.reply(downloadResult.error, {
              reply_to_message_id: msg.message_id,
            });
            return;
          }

          // Determine MIME type from the actual file extension
          const mimeType = getAudioMimeType(downloadResult.filePath);

          // Fetch recent history for context
          const activeTopic = await GeminiService.ensureTopicSummary(
            chatIdStr,
            chatSettings.current_topic
          );
          const history = Repository.getRecentMessages(
            chatIdStr,
            CONFIG.IMAGE_HISTORY_LIMIT
          );

          logger.info(`[Voice] Sending voice message to Gemini for analysis...`);
          const reply = await GeminiService.generateVoiceReply(
            downloadResult.buffer,
            mimeType,
            history,
            activeTopic
          );

          // Reply to the voice message
          await sendLongMessage(ctx, reply, {
            reply_to_message_id: msg.message_id,
          });
        } catch (error) {
          logger.error("Error processing voice message:", error);
          await ctx.reply(
            "Failed to process your voice message. Please try again later.",
            {
              reply_to_message_id: msg.message_id,
            }
          );
        }
      })
    );
  });
}
