import { Bot, Context } from "grammy";
import { botUsername, withTyping } from "../services/bot";
import { Repository } from "../db/repository";
import { GeminiService } from "../services/gemini/index";
import { CONFIG } from "../config";
import { isConversationFollowUp } from "../utils/conversation";
import { sendLongMessage } from "../utils/message";

const COOLDOWN_SECONDS = 300; // 5 minutes cooldown between random replies

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

    // 1. Check if it's a mention, nickname match, reply, or quick follow-up
    const containsNickname = /\bket\b/i.test(text);
    const isMentioned = text.includes(`@${botUsername}`);
    const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
    const isPrivateChat = chat.type === "private";

    const isFollowUp = isConversationFollowUp(chatIdStr, from.id, msg.date);
    if (isFollowUp) {
      console.log(`[Conversation] Follow-up detected for user ${from.first_name} in chat ${chatIdStr}`);
    }

    const isDirectInteraction = isMentioned || isReplyToBot || isPrivateChat || containsNickname || isFollowUp;

    // Get chat configuration
    const chatSettings = Repository.getChat(chatIdStr);
    if (!chatSettings) return;

    if (isDirectInteraction) {
      // Direct interaction: reply immediately
      await withTyping(ctx, async () => {
        const activeTopic = await GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic);
        const history = Repository.getRecentMessages(chatIdStr, CONFIG.CHAT_HISTORY_LIMIT);
        const reply = await GeminiService.generateReply(
          history,
          activeTopic,
          false
        );

        // Send reply directly referencing the user's message
        await sendLongMessage(ctx, reply, {
          reply_to_message_id: msg.message_id,
        });
      });
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
        console.log(`[Spontaneous] Rolling SUCCESS for chat ${chatIdStr} (Roll: ${roll.toFixed(4)} < ${chatSettings.reply_probability})`);

        // Update last random reply timestamp before processing to prevent double triggers
        Repository.updateChatSettings(chatIdStr, { last_random_reply_at: now });

        await withTyping(ctx, async () => {
          const activeTopic = await GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic);
          const history = Repository.getRecentMessages(chatIdStr, CONFIG.CHAT_HISTORY_LIMIT);
          const reply = await GeminiService.generateReply(
            history,
            activeTopic,
            true
          );

          // Spontaneous message: sent directly to the chat without reply tag (like a human chiming in)
          await sendLongMessage(ctx, reply);
        });
      }
    }
  });
}
