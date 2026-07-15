import { Bot, Context } from "grammy";
import { CONFIG } from "../config/index.ts";
import { Repository } from "../db/repository.ts";

/**
 * Checks if the user is the bot owner or an administrator of the group.
 */
async function isAuthorized(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;

  // Bot owner is always authorized
  if (CONFIG.BOT_OWNER_ID && ctx.from.id === CONFIG.BOT_OWNER_ID) {
    return true;
  }

  // Authorized in private chat (if they passed whitelist check)
  if (ctx.chat?.type === "private") {
    return true;
  }

  // Check if user is group admin
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["creator", "administrator"].includes(member.status);
  } catch (error) {
    return false;
  }
}

export function registerCommands(bot: Bot) {
  // 1. /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Hi! I am an LLM-powered AI bot. I track group history, " +
      "answer your questions, recognize photos, listen to voice messages, and sometimes chime in on my own.\n"
    );
  });

  // 2. /help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "How can I help you? Here is what I can do:\n\n" +
      "**Chat**: I respond if you reply to me directly or mention me in your message.\n" +
      "**Spontaneous Participation**: I occasionally chime in on the group conversation and provide comments.\n" +
      "**Image Recognition**: If you send me a photo, I will understand what it is and comment on it based on our conversation.\n" +
      "**Voice Messages**: If you send a voice message, I will listen and respond.\n" +
      "**Management Commands**:\n" +
      "• `/reset` — Clear memory\n" +
      "• `/prob [0-100]` — Probability of random response\n" +
      "• `/stats` — Group statistics\n" +
      "• `/memories` — View saved memories\n" +
      "• `/model [model]` — Change AI model (Owner)",
      { parse_mode: "Markdown" }
    );
  });

  // 3. /reset command
  bot.command("reset", async (ctx) => {
    if (!ctx.chat) return;

    if (!(await isAuthorized(ctx))) {
      await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
      return;
    }

    const chatId = ctx.chat.id.toString();
    Repository.clearChatHistory(chatId);
    await ctx.reply("Done bro, history cleared. My brain is fresh, we're starting from scratch!");
  });

  // 6. Admin command: /allow <chatId> (Owner only)
  bot.command("allow", async (ctx) => {
    if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) return;

    const targetChatId = ctx.match?.trim();
    if (!targetChatId) {
      await ctx.reply("Usage: /allow <chat_id>");
      return;
    }

    const chat = Repository.getChat(targetChatId);
    if (!chat) {
      Repository.createChat(targetChatId, "Whitelisted Chat", true);
    } else {
      Repository.setChatAllowed(targetChatId, true);
    }

    await ctx.reply(`✅ Chat permission granted to group ID \`${targetChatId}\`.`, { parse_mode: "Markdown" });
  });

  // 7. Admin command: /disallow <chatId> (Owner only)
  bot.command("disallow", async (ctx) => {
    if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) return;

    const targetChatId = ctx.match?.trim();
    if (!targetChatId) {
      await ctx.reply("Usage: /disallow <chat_id>");
      return;
    }

    Repository.setChatAllowed(targetChatId, false);
    await ctx.reply(`❌ Chat permission revoked for group ID \`${targetChatId}\`.`, { parse_mode: "Markdown" });
  });

  // 8. /prob command to adjust response probability
  bot.command("prob", async (ctx) => {
    if (!ctx.chat) return;

    if (!(await isAuthorized(ctx))) {
      await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
      return;
    }

    const matchValue = ctx.match?.trim();
    const chatId = ctx.chat.id.toString();

    if (!matchValue) {
      const chat = Repository.getChat(chatId);
      const currentProbability = Math.round((chat?.reply_probability ?? 0.05) * 100);
      await ctx.reply(`My random reply probability is currently ${currentProbability}%. To change it, type: \`/prob 10\` (for 10%).`, { parse_mode: "Markdown" });
      return;
    }

    const probabilityValue = parseInt(matchValue, 10);
    if (isNaN(probabilityValue) || probabilityValue < 0 || probabilityValue > 100) {
      await ctx.reply("You must enter a percentage value between 0 and 100.");
      return;
    }

    Repository.updateChatSettings(chatId, { reply_probability: probabilityValue / 100 });
    await ctx.reply(`Got it my random reply probability is updated to ${probabilityValue}%! 🎲`);
  });

  // 9. /stats command — group chat statistics
  bot.command("stats", async (ctx) => {
    if (!ctx.chat) return;
    const chatId = ctx.chat.id.toString();

    const stats = Repository.getChatStats(chatId);
    const chatSettings = Repository.getChat(chatId);

    const topUsersText = stats.topUsers.length > 0
      ? stats.topUsers.map((user, index) => `  ${index + 1}. ${user.first_name || "Anonymous"} — ${user.msg_count} messages`).join("\n")
      : "  Not enough data yet.";

    const currentTopic = chatSettings?.current_topic || "Not set";

    await ctx.reply(
      `📊 **Group Statistics**\n\n` +
      `💬 Total messages: ${stats.totalMessages}\n` +
      `👥 Unique users: ${stats.uniqueUsers}\n` +
      `📅 Messages today: ${stats.todayMessages}\n\n` +
      `🏆 **Most Active Members:**\n${topUsersText}\n\n` +
      `📌 Current topic: "${currentTopic}"`,
      { parse_mode: "Markdown" }
    );
  });

  // 10. /memories command — view or clear bot memories for this chat
  bot.command("memories", async (ctx) => {
    if (!ctx.chat) return;
    const chatId = ctx.chat.id.toString();
    const subCommand = ctx.match?.trim().toLowerCase();

    if (subCommand === "clear") {
      if (!(await isAuthorized(ctx))) {
        await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
        return;
      }
      Repository.clearMemories(chatId);
      await ctx.reply("All my memories for this group have been cleared.");
      return;
    }

    const memories = Repository.getMemories(chatId);
    if (memories.length === 0) {
      await ctx.reply("No saved memories for this group yet.");
      return;
    }

    const memoryList = memories.map((memory, index) => `${index + 1}. ${memory.text}`).join("\n");

    await ctx.reply(
      `**Saved Memories** (${memories.length}/2000):\n\n${memoryList}\n\n` +
      `To delete: \`/memories clear\``,
      { parse_mode: "Markdown" }
    );
  });

  // 11. /model command — switch Gemini model per chat (Owner only)
  bot.command("model", async (ctx) => {
    if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) return;

    const modelName = ctx.match?.trim();

    if (!modelName) {
      await ctx.reply(
        `**Current model**: \`${CONFIG.GEMINI_MODEL}\`\n\n` +
        `To change:\n` +
        `\`/model gemini-3.5-flash\`\n` +
        `\`/model gemini-3.1-pro\`\n` +
        `\`/model gemini-3.1-flash-lite\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    if (!modelName.startsWith("gemini-")) {
      await ctx.reply("Model name must start with 'gemini-'.");
      return;
    }

    CONFIG.GEMINI_MODEL = modelName;
    await ctx.reply(`✅ Model changed to \`${modelName}\`! New responses will be generated with this model.`, { parse_mode: "Markdown" });
  });
}
