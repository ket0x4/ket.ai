import { Bot, Context } from "grammy";
import { CONFIG } from "../config/index";
import { Repository } from "../db/repository";
import { GeminiService } from "./gemini/index";
import { registerCommands } from "../modules/commands";
import { registerChatHandlers } from "../modules/chat";
import { registerImageHandlers } from "../modules/image";
import { registerVoiceHandlers } from "../modules/voice";

export const bot = new Bot(CONFIG.TELEGRAM_BOT_TOKEN);

// Intercept all outgoing sendMessage API calls to save the bot's own replies to SQLite history.
// This is critical because Telegram Bot API does not send updates for messages sent by the bot itself.
bot.api.config.use(async (prev, method, payload, signal) => {
  const result = await prev(method, payload, signal);

  if (method === "sendMessage" && payload && typeof payload === "object" && "chat_id" in payload && "text" in payload) {
    try {
      const chatId = (payload.chat_id ?? "").toString();
      const text = (payload as any).text;

      if (result && typeof result === "object" && "message_id" in result) {
        const sentMsg = result as any;
        const from = sentMsg.from;

        Repository.saveMessage({
          chatId: chatId,
          messageId: sentMsg.message_id,
          userId: from?.id || 0,
          username: from?.username || undefined,
          firstName: from?.first_name || "ket",
          replyToFirstName: sentMsg.reply_to_message?.from?.first_name || undefined,
          text: text,
          isBotReply: true,
          sentAt: sentMsg.date || Math.floor(Date.now() / 1000),
        });
      }
    } catch (e) {
      console.error("[Bot Outgoing Logger] Failed to archive bot reply:", e);
    }
  }

  return result;
});

export let botUsername = "";

/**
 * Helper to run an async operation while showing a "typing" indicator to users.
 */
export async function withTyping(ctx: Context, action: () => Promise<void>) {
  try {
    await ctx.replyWithChatAction("typing");
  } catch (e) {
    // Ignore error if chat action fails
  }

  // Keep sending typing action every 4 seconds since Telegram times it out after 5s
  const interval = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, 4000);

  try {
    await action();
  } finally {
    clearInterval(interval);
  }
}

/**
 * Initializes and configures the bot.
 */
export async function initBot() {
  console.log("Fetching bot metadata...");
  const me = await bot.api.getMe();
  botUsername = me.username;
  console.log(`Bot initialized as @${botUsername}`);

  // 1. Middleware: Whitelist Checker
  bot.use(async (ctx, next) => {
    const chat = ctx.chat;
    if (!chat) return await next();

    const chatIdStr = chat.id.toString();

    // Check if it's a private chat
    if (chat.type === "private") {
      const isOwner = CONFIG.BOT_OWNER_ID && ctx.from?.id === CONFIG.BOT_OWNER_ID;
      if (isOwner) {
        // Register the private chat so commands like /settings work
        let dbChat = Repository.getChat(chatIdStr);
        if (!dbChat) {
          Repository.createChat(chatIdStr, `Özel Sohbet (${ctx.from?.first_name || "Sahip"})`, true);
        }
        return await next();
      }

      // Ignore other users in DM to avoid unauthorized API usage
      await ctx.reply(CONFIG.MESSAGES.private_chat_unauthorized);
      return;
    }

    // Check if group is allowed in environment variable
    const isEnvAllowed = CONFIG.ALLOWED_CHAT_IDS.includes(chatIdStr);

    // Fetch or create chat settings in SQLite
    let dbChat = Repository.getChat(chatIdStr);
    if (!dbChat) {
      dbChat = Repository.createChat(chatIdStr, chat.title || "Grup", isEnvAllowed);
    }

    const isAllowed = isEnvAllowed || dbChat.is_allowed === 1;

    if (!isAllowed) {
      console.log(`[Security] Bot added/active in unauthorized group: ${chat.title} (${chatIdStr}). Leaving...`);
      try {
        // Safe reply (catch error if bot has no write access or was kicked)
        await ctx.reply(CONFIG.MESSAGES.unauthorized_group_reply).catch(() => {});
        await ctx.leaveChat();
      } catch (e) {
        console.log(`[Security] Could not cleanly leave chat ${chatIdStr} (possibly already removed).`);
      }
      return;
    }

    await next();
  });

  // 2. Middleware: Message Archiver & Background Topic Summarizer
  bot.on(["message:text", "message:photo", "message:voice"], async (ctx, next) => {
    const chat = ctx.chat;
    const msg = ctx.message;
    const from = ctx.from;

    if (!chat || !msg || !from) return await next();

    const chatIdStr = chat.id.toString();
    let textContent = msg.text || msg.caption || null;
    let photoFileId: string | null = null;

    if (msg.photo) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      photoFileId = largestPhoto.file_id;
    }

    const isSelf = from.is_bot && from.username === botUsername;

    // Save history
    Repository.saveMessage({
      chatId: chatIdStr,
      messageId: msg.message_id,
      userId: from.id,
      username: from.username || undefined,
      firstName: from.first_name,
      replyToFirstName: msg.reply_to_message?.from?.first_name || undefined,
      text: textContent || undefined,
      photoFileId: photoFileId || undefined,
      isBotReply: isSelf,
      sentAt: msg.date,
    });

    // Run message retention cleanup every 100 user messages
    if (!from.is_bot) {
      const retentionCount = Repository.getMessageCount(chatIdStr);
      if (retentionCount > 0 && retentionCount % 100 === 0) {
        (async () => {
          try {
            const pruned = Repository.pruneOldMessages(chatIdStr, 7);
            if (pruned > 0) {
              console.log(`[Retention] Pruned ${pruned} old messages from chat ${chatIdStr}`);
            }
          } catch (err) {
            console.error("[Retention] Error pruning old messages:", err);
          }
        })();
      }
    }

    await next();
  });

  // 3. Permission Checker: Ensure bot can write, otherwise leave immediately
  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.chat;
    if (!chat || chat.type === "private") return;

    try {
      const fullChat = await ctx.getChat();
      const botMember = await ctx.getChatMember(ctx.me.id);

      if (botMember.status === "left" || botMember.status === "kicked") return;

      let canWrite = true;

      if (botMember.status === "administrator" || botMember.status === "creator") {
        canWrite = true;
      } else if (botMember.status === "restricted") {
        canWrite = botMember.can_send_messages === true;
      } else {
        // Status is 'member', check group's default permissions
        if (fullChat.permissions) {
          canWrite = fullChat.permissions.can_send_messages !== false;
        }
      }

      if (!canWrite) {
        console.log(`[Security] Bot lacks write permissions in ${chat.title || "Group"} (${chat.id}). Leaving...`);
        await ctx.leaveChat().catch(() => {});
      }
    } catch (e) {
      console.error("[Security] Error checking permissions on my_chat_member:", e);
    }
  });

  registerCommands(bot);
  registerChatHandlers(bot);
  registerImageHandlers(bot);
  registerVoiceHandlers(bot);

  console.log("All bot modules successfully registered.");
}

/**
 * Starts the bot in long polling mode.
 */
export async function startBot() {
  await initBot();
  console.log("Bot long polling starting...");
  bot.start({
    onStart(info) {
      console.log(`Successfully started bot polling for @${info.username}`);
    },
  });
}
