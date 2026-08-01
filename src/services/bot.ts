import { Bot, Context } from "grammy";
import { CONFIG } from "../config/index";
import { Repository } from "../db/repository";
import { registerCommands } from "../modules/commands";
import { registerChatHandlers } from "../modules/chat";
import { registerImageHandlers } from "../modules/image";
import { registerVoiceHandlers } from "../modules/voice";
import logger from "../utils/logger";

export const bot = new Bot(CONFIG.TELEGRAM_BOT_TOKEN);

// --- Per-chat processing queue to prevent concurrent Gemini calls ---
const chatProcessingQueue = new Map<string, Promise<void>>();

/**
 * Serializes async operations per chat to prevent race conditions
 * when multiple messages arrive simultaneously for the same chat.
 * Returns immediately if a previous operation is still running — the
 * new operation is chained and will execute after the current one completes.
 */
export function withChatLock(
  chatId: string,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = chatProcessingQueue.get(chatId) ?? Promise.resolve();
  const next = prev.then(fn, fn); // Always chain, even if previous rejected
  chatProcessingQueue.set(chatId, next);

  // Cleanup: remove from map when the chain settles to prevent memory leak
  next.finally(() => {
    if (chatProcessingQueue.get(chatId) === next) {
      chatProcessingQueue.delete(chatId);
    }
  });

  return next;
}

/**
 * Extracts message metadata from Telegram API result and saves to DB.
 */
function saveOutgoingMessage(
  chatId: string,
  messageId: number,
  text: string,
  apiResult: unknown,
): void {
  const sentMsg =
    typeof apiResult === "object" && apiResult !== null
      ? (apiResult as Record<string, unknown>)
      : undefined;
  const from = sentMsg?.from as Record<string, unknown> | undefined;
  const replyMsg = sentMsg?.reply_to_message as
    | Record<string, unknown>
    | undefined;
  const replyFrom = replyMsg?.from as Record<string, unknown> | undefined;

  Repository.saveMessage({
    chatId,
    messageId,
    userId: (from?.id as number) || 0,
    username: (from?.username as string) || undefined,
    firstName: (from?.first_name as string) || "ket",
    replyToMessageId: (replyMsg?.message_id as number) || undefined,
    text,
    isBotReply: true,
    sentAt: (sentMsg?.date as number) || Math.floor(Date.now() / 1000),
  });
}

// Intercept outgoing sendMessage and editMessageText API calls to save/update the bot's own replies in SQLite history.
bot.api.config.use(async (prev, method, payload, signal) => {
  const result = await prev(method, payload, signal);

  if (
    (method === "sendMessage" || method === "editMessageText") &&
    payload &&
    typeof payload === "object" &&
    "chat_id" in payload &&
    "text" in payload
  ) {
    try {
      const chatId = String(payload.chat_id ?? "");
      const text = String((payload as Record<string, unknown>).text ?? "");

      // Ignore temporary status notifications so they don't pollute Gemini conversation history
      const isTransientStatus =
        text === CONFIG.MESSAGES.tool_status_web_search ||
        text.includes("gimme a sec bro, checking");

      if (isTransientStatus) {
        return result;
      }

      const payloadRecord = payload as Record<string, unknown>;
      const resultRecord =
        typeof result === "object" && result !== null
          ? (result as unknown as Record<string, unknown>)
          : undefined;
      const msgId =
        (payloadRecord.message_id as number) ||
        (resultRecord?.message_id as number) ||
        undefined;

      if (chatId && msgId) {
        if (method === "editMessageText") {
          const updated = Repository.updateMessageText(chatId, msgId, text);
          if (!updated) {
            saveOutgoingMessage(chatId, msgId, text, result);
          }
        } else {
          saveOutgoingMessage(chatId, msgId, text, result);
        }
      }
    } catch (e) {
      logger.error("[Bot Outgoing Logger] Failed to archive bot reply:", e);
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

const leavingChats = new Set<string>();

/**
 * Initializes and configures the bot.
 */
export async function initBot() {
  logger.info("Fetching bot metadata...");
  const me = await bot.api.getMe();
  botUsername = me.username;
  logger.info(`Bot initialized as @${botUsername}`);

  // 1. Seed initially allowed chats from config/env
  Repository.initSeedAllowedChats(CONFIG.ALLOWED_CHAT_IDS);

  // 2. Middleware: Whitelist Checker
  bot.use(async (ctx, next) => {
    const chat = ctx.chat;
    if (!chat) return await next();

    const chatIdStr = chat.id.toString();

    // Check if it's a private chat
    if (chat.type === "private") {
      const isOwner =
        CONFIG.BOT_OWNER_ID && ctx.from?.id === CONFIG.BOT_OWNER_ID;
      if (isOwner) {
        // Register the private chat so commands like /settings work
        let dbChat = Repository.getChat(chatIdStr);
        if (!dbChat) {
          Repository.createChat(
            chatIdStr,
            `Private Chat (${ctx.from?.first_name || "Owner"})`,
            true,
          );
        }
        return await next();
      }

      // Ignore other users in DM to avoid unauthorized API usage
      await ctx.reply(CONFIG.MESSAGES.private_chat_unauthorized);
      return;
    }

    // Fetch chat settings in SQLite
    let dbChat = Repository.getChat(chatIdStr);

    // Check if group is explicitly allowed in DB
    const isAllowed = dbChat?.is_allowed === 1;

    if (!isAllowed) {
      // If it's a message, or the bot was just added, leave immediately.
      // But don't spam API with leave requests for every minor update (like typing status).
      if (ctx.message || ctx.myChatMember) {
        if (!leavingChats.has(chatIdStr)) {
          leavingChats.add(chatIdStr);
          logger.warn(
            `[Security] Bot active in unauthorized group: ${chat.title} (${chatIdStr}). Leaving...`,
          );
          try {
            await ctx
              .reply(CONFIG.MESSAGES.unauthorized_group_reply)
              .catch(() => {});
            await ctx.leaveChat();
          } catch (e) {
            logger.warn(
              `[Security] Could not cleanly leave chat ${chatIdStr}.`,
            );
          }
          // Remove from set after a timeout so it can retry if it failed
          setTimeout(() => leavingChats.delete(chatIdStr), 60000);
        }
      }
      return;
    }

    await next();
  });

  // 3. Supergroup Migration Handler
  bot.on("message:migrate_to_chat_id", async (ctx) => {
    const oldChatId = ctx.chat.id.toString();
    const newChatId = ctx.message.migrate_to_chat_id.toString();

    logger.info(
      `[Migration] Group upgraded to supergroup. Migrating ${oldChatId} -> ${newChatId}`,
    );
    Repository.migrateChat(oldChatId, newChatId);
  });

  // 4. Middleware: Message Archiver & Background Topic Summarizer
  bot.on(
    ["message:text", "message:photo", "message:voice"],
    async (ctx, next) => {
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
        replyToMessageId: msg.reply_to_message?.message_id || undefined,
        text: textContent || undefined,
        photoFileId: photoFileId || undefined,
        isBotReply: isSelf,
        sentAt: msg.date,
      });

      // Run message retention cleanup every 100 user messages
      if (!from.is_bot) {
        const retentionCount = Repository.getMessageCount(chatIdStr);
        if (retentionCount > 0 && retentionCount % 100 === 0) {
          // Explicitly fire-and-forget with proper error boundary
          void Promise.resolve().then(() => {
            try {
              const pruned = Repository.pruneOldMessages(chatIdStr, 7);
              if (pruned > 0) {
                logger.info(
                  `[Retention] Pruned ${pruned} old messages from chat ${chatIdStr}`,
                );
              }
            } catch (err) {
              logger.error("[Retention] Error pruning old messages:", err);
            }
          });
        }
      }

      await next();
    },
  );

  // 5. Permission Checker: Ensure bot can write, otherwise leave immediately
  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.chat;
    if (!chat || chat.type === "private") return;

    try {
      const fullChat = await ctx.getChat();
      const botMember = await ctx.getChatMember(ctx.me.id);

      if (botMember.status === "left" || botMember.status === "kicked") return;

      let canWrite = true;

      if (
        botMember.status === "administrator" ||
        botMember.status === "creator"
      ) {
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
        logger.warn(
          `[Security] Bot lacks write permissions in ${chat.title || "Group"} (${chat.id}). Leaving...`,
        );
        await ctx.leaveChat().catch(() => {});
      }
    } catch (e) {
      logger.error(
        "[Security] Error checking permissions on my_chat_member:",
        e,
      );
    }
  });

  registerCommands(bot);
  registerChatHandlers(bot);
  registerImageHandlers(bot);
  registerVoiceHandlers(bot);

  logger.info("All bot modules successfully registered.");
}

/**
 * Starts the bot in long polling mode.
 */
export async function startBot() {
  await initBot();
  logger.info("Bot long polling starting...");
  bot.start({
    drop_pending_updates: true,
    onStart(info) {
      logger.info(`Successfully started bot polling for @${info.username}`);
    },
  });
}
