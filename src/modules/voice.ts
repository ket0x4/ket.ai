import { Bot } from "grammy";
import { CONFIG } from "../config/index.ts";
import { botUsername, withTyping } from "../services/bot.ts";
import { Repository } from "../db/repository.ts";
import { GeminiService } from "../services/gemini.ts";
import { isConversationFollowUp } from "../utils/conversation.ts";

export function registerVoiceHandlers(bot: Bot) {
  // Listen to voice messages
  bot.on("message:voice", async (ctx) => {
    const msg = ctx.message;
    const chat = ctx.chat;
    const chatIdStr = chat.id.toString();
    const caption = ""; // Voice messages don't have captions

    // 1. Check if the bot is mentioned via reply or in private chat
    const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
    const isPrivateChat = chat.type === "private";

    // Detect quick conversation follow-up
    const isFollowUp = ctx.from ? isConversationFollowUp(chatIdStr, ctx.from.id, msg.date) : false;
    if (isFollowUp) {
      console.log(`[Voice] Follow-up voice detected for user ${ctx.from?.first_name} in chat ${chatIdStr}`);
    }

    const isDirectInteraction = isReplyToBot || isPrivateChat || isFollowUp;

    if (!isDirectInteraction) {
      // Not directed to the bot, just log and skip
      return;
    }

    const chatSettings = Repository.getChat(chatIdStr);
    if (!chatSettings) return;

    await withTyping(ctx, async () => {
      try {
        console.log(`[Voice] Downloading voice message from Telegram...`);

        // Fetch file path details from Telegram
        const fileDetails = await ctx.getFile();
        if (!fileDetails.file_path) {
          await ctx.reply("Ses dosyasını çekemedim, Telegram izin vermedi.", {
            reply_to_message_id: msg.message_id,
          });
          return;
        }

        // Download the voice file contents
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${fileDetails.file_path}`;
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Telegram file download failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine MIME type from file extension
        const mimeType = fileDetails.file_path.endsWith(".oga") ? "audio/ogg" : "audio/ogg";

        // Fetch recent history for context
        const activeTopic = await GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic);
        const history = Repository.getRecentMessages(chatIdStr, CONFIG.IMAGE_HISTORY_LIMIT);

        console.log(`[Voice] Sending voice message to Gemini for analysis...`);
        const reply = await GeminiService.generateVoiceReply(
          buffer,
          mimeType,
          history,
          activeTopic
        );

        // Reply to the voice message
        await ctx.reply(reply, {
          reply_to_message_id: msg.message_id,
        });

      } catch (error) {
        console.error("Error processing voice message:", error);
        await ctx.reply("Ses mesajını dinlerken kafam karıştı, tekrar dener misin?", {
          reply_to_message_id: msg.message_id,
        });
      }
    });
  });
}
