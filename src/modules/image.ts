import { Bot } from "grammy";
import { CONFIG } from "../config/index";
import { botUsername, withTyping } from "../services/bot";
import { Repository } from "../db/repository";
import { GeminiService } from "../services/gemini/index";
import { isConversationFollowUp } from "../utils/conversation";
import { sendLongMessage } from "../utils/message";
import logger from "../utils/logger";

export function registerImageHandlers(bot: Bot) {
  // Listen to photo messages
  bot.on("message:photo", async (ctx) => {
    const msg = ctx.message;
    const chat = ctx.chat;
    const chatIdStr = chat.id.toString();
    const caption = msg.caption || "";

    // 1. Check if the bot is mentioned, nickname match, replied to, or in private chat
    const containsNickname = /\bket\b/i.test(caption);
    const isMentioned = caption.includes(`@${botUsername}`);
    const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
    const isPrivateChat = chat.type === "private";

    const isFollowUp = ctx.from ? isConversationFollowUp(chatIdStr, ctx.from.id, msg.date) : false;
    if (isFollowUp) {
      logger.debug(`[Image] Follow-up photo detected for user ${ctx.from?.first_name} in chat ${chatIdStr}`);
    }

    const isDirectInteraction = isMentioned || isReplyToBot || isPrivateChat || containsNickname || isFollowUp;

    if (!isDirectInteraction) {
      // Not directed to the bot, we just log it (already logged by middleware) and do nothing
      return;
    }

    const chatSettings = Repository.getChat(chatIdStr);
    if (!chatSettings) return;

    // Get the highest resolution photo
    const photo = msg.photo[msg.photo.length - 1];

    await withTyping(ctx, async () => {
      try {
        logger.info(`[Image] Downloading photo ${photo.file_id} from Telegram...`);

        // Fetch file path details from Telegram
        const fileDetails = await ctx.getFile();
        if (!fileDetails.file_path) {
          await ctx.reply(CONFIG.MESSAGES.image_download_failed, {
            reply_to_message_id: msg.message_id,
          });
          return;
        }

        const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB
        if (fileDetails.file_size && fileDetails.file_size > MAX_FILE_SIZE_BYTES) {
          await ctx.reply("Fotoğraf boyutu çok büyük (maksimum 30MB gönderilebilir).", {
            reply_to_message_id: msg.message_id,
          });
          return;
        }

        // Download the file contents
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${fileDetails.file_path}`;
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Telegram file download failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Fetch recent history for context
        const [activeTopic, history] = await Promise.all([
          GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic),
          Promise.resolve(Repository.getRecentMessages(chatIdStr, CONFIG.IMAGE_HISTORY_LIMIT)),
        ]);

        logger.info(`[Image] Sending photo to Gemini for analysis...`);
        const reply = await GeminiService.generateImageReply(
          buffer,
          "image/jpeg", // Telegram converts all photo files to JPEG
          history,
          activeTopic
        );

        // Reply to the photo message
        await sendLongMessage(ctx, reply, {
          reply_to_message_id: msg.message_id,
        });

      } catch (error) {
        logger.error("Error processing photo:", error);
        await ctx.reply(CONFIG.MESSAGES.image_processing_failed, {
          reply_to_message_id: msg.message_id,
        });
      }
    });
  });
}
