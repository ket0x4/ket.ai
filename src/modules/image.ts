import { Bot } from "grammy";
import { CONFIG } from "../config/index.ts";
import { botUsername, withTyping } from "../services/bot.ts";
import { Repository } from "../db/repository.ts";
import { GeminiService } from "../services/gemini.ts";
import { isConversationFollowUp } from "../utils/conversation.ts";

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
      console.log(`[Image] Follow-up photo detected for user ${ctx.from?.first_name} in chat ${chatIdStr}`);
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
        console.log(`[Image] Downloading photo ${photo.file_id} from Telegram...`);
        
        // Fetch file path details from Telegram
        const fileDetails = await ctx.getFile();
        if (!fileDetails.file_path) {
          await ctx.reply(CONFIG.MESSAGES.image_download_failed, {
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
        const history = Repository.getRecentMessages(chatIdStr, CONFIG.IMAGE_HISTORY_LIMIT);

        console.log(`[Image] Sending photo to Gemini for analysis...`);
        const reply = await GeminiService.generateImageReply(
          buffer,
          "image/jpeg", // Telegram converts all photo files to JPEG
          history,
          chatSettings.current_topic
        );

        // Reply to the photo message
        await ctx.reply(reply, {
          reply_to_message_id: msg.message_id,
        });

      } catch (error) {
        console.error("Error processing photo:", error);
        await ctx.reply(CONFIG.MESSAGES.image_processing_failed, {
          reply_to_message_id: msg.message_id,
        });
      }
    });
  });
}
