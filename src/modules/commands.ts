import { type Bot, type Context, InlineKeyboard } from "grammy";
import { CONFIG, updateModel } from "../config/index";
import { Repository } from "../db/repository";
import { processNewMemory } from "../services/gemini/memory";
import logger from "../utils/logger";
import { extractTelegramChatTitle } from "../utils/message";

/**
 * Checks if the user is authorized for given chat member roles (or owner / private chat).
 */
async function checkMemberRole(
	ctx: Context,
	allowedRoles: string[],
): Promise<boolean> {
	if (!ctx.from) return false;

	// Bot owner is always authorized
	if (CONFIG.BOT_OWNER_ID && ctx.from.id === CONFIG.BOT_OWNER_ID) {
		return true;
	}

	// Authorized in private chat (if they passed whitelist check)
	if (ctx.chat?.type === "private") {
		return true;
	}

	try {
		const member = await ctx.getChatMember(ctx.from.id);
		return allowedRoles.includes(member.status);
	} catch {
		return false;
	}
}

async function isAuthorized(ctx: Context): Promise<boolean> {
	return checkMemberRole(ctx, ["creator", "administrator"]);
}

async function isOwnerOrCreator(ctx: Context): Promise<boolean> {
	return checkMemberRole(ctx, ["creator"]);
}

function resolveRememberTarget(ctx: Context): {
	fact: string;
	userId: number;
	userName: string;
} {
	let fact = typeof ctx.match === "string" ? ctx.match.trim() : "";
	let userId = ctx.from?.id || 0;
	let userName = ctx.from?.first_name || "User";

	const repliedMsg = ctx.message?.reply_to_message;
	if (repliedMsg) {
		if (repliedMsg.from) {
			userId = repliedMsg.from.id;
			userName = repliedMsg.from.first_name || "User";
		}
		if (!fact && repliedMsg.text) {
			fact = repliedMsg.text;
		}
	}
	return { fact, userId, userName };
}

export function registerCommandHandlers(bot: Bot) {
	// 1. /start command
	bot.command("start", async (ctx) => {
		logger.info(
			`[Commands:start] User ${ctx.from?.id} (${ctx.from?.first_name}) invoked /start in chat ${ctx.chat?.id}`,
		);
		await ctx.reply(
			"Hi! I am an LLM-powered AI bot. I track group history, " +
				"answer your questions, recognize photos, listen to voice messages, and participate in conversations.",
		);
	});

	// 2. /help command
	bot.command("help", async (ctx) => {
		logger.info(
			`[Commands:help] User ${ctx.from?.id} (${ctx.from?.first_name}) invoked /help in chat ${ctx.chat?.id}`,
		);
		await ctx.reply(
			"Available Commands & Capabilities:\n\n" +
				"**Chat**: I respond if you reply to me directly or mention me in your message.\n" +
				"**Spontaneous Participation**: I occasionally chime in on the group conversation.\n" +
				"**Image & Voice Recognition**: I understand photos and listen to voice messages.\n" +
				"**Management Commands**:\n" +
				"• `/app` or `/admin` — Open Web Mini App Dashboard\n" +
				"• `/remember <fact>` — Save a new fact to memory\n" +
				"• `/prob [0-100]` — Set random reply probability (Admin)\n" +
				"• `/reset` — Clear chat history and memory (Admin)\n" +
				"• `/model [model]` — Switch AI model (Owner)",
			{ parse_mode: "Markdown" },
		);
	});

	// 2b. /app and /admin commands for Telegram Mini App
	bot.command(["app", "admin"], async (ctx) => {
		try {
			if (!(await isAuthorized(ctx))) {
				logger.warn(
					`[Commands:app] Unauthorized /app or /admin attempt by user ${ctx.from?.id} (${ctx.from?.first_name}) in chat ${ctx.chat?.id}`,
				);
				await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
				return;
			}

			logger.info(
				`[Commands:app] User ${ctx.from?.id} (${ctx.from?.first_name}) opened Mini App dashboard button in chat ${ctx.chat?.id}`,
			);

			const appUrl =
				CONFIG.WEB_APP_URL || `http://localhost:${CONFIG.WEB_PORT}`;
			const isPrivate = ctx.chat?.type === "private";
			const botUsername = ctx.me?.username || "";

			const keyboard = new InlineKeyboard();
			if (isPrivate) {
				keyboard.webApp("Open Dashboard", appUrl);
			} else if (botUsername) {
				keyboard.url(
					"Open Mini App",
					`https://t.me/${botUsername}?startapp=dashboard`,
				);
			} else {
				keyboard.webApp("Open Dashboard", appUrl);
			}

			await ctx.reply(
				"Click the button below to open the Admin & Memory Dashboard:",
				{ reply_markup: keyboard },
			);
		} catch (error) {
			logger.error("[Commands:app] Error handling /app or /admin:", error);
		}
	});

	// 3. /reset command
	bot.command("reset", async (ctx) => {
		if (!ctx.chat) return;

		if (!(await isOwnerOrCreator(ctx))) {
			logger.warn(
				`[Commands:reset] Unauthorized /reset attempt by user ${ctx.from?.id} (${ctx.from?.first_name}) in chat ${ctx.chat.id}`,
			);
			await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
			return;
		}

		const chatId = ctx.chat.id.toString();
		Repository.clearChatHistory(chatId);
		logger.info(
			`[Commands:reset] Cleared chat history and memories for chat ${chatId} by user ${ctx.from?.id} (${ctx.from?.first_name})`,
		);
		await ctx.reply("Chat history and group memories cleared successfully.");
	});

	async function fetchTelegramChatTitle(
		api: Context["api"],
		chatId: string,
	): Promise<string> {
		try {
			const tgChat = await api.getChat(chatId);
			return extractTelegramChatTitle(tgChat);
		} catch (e) {
			logger.debug(
				`[/allow] Could not fetch Telegram chat title for ${chatId}:`,
				e,
			);
		}
		return "";
	}

	// 4. Admin command: /allow <chatId> (Owner only)
	bot.command("allow", async (ctx) => {
		if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) {
			logger.warn(
				`[Commands:allow] Unauthorized /allow attempt by user ${ctx.from?.id} (${ctx.from?.first_name})`,
			);
			return;
		}

		const targetChatId = ctx.match?.trim();
		if (!targetChatId) {
			logger.info(
				`[Commands:allow] Owner ${ctx.from?.id} invoked /allow with missing chat ID`,
			);
			await ctx.reply("Usage: /allow <chat_id>");
			return;
		}

		const title = await fetchTelegramChatTitle(ctx.api, targetChatId);
		const chat = Repository.getChat(targetChatId);
		if (!chat) {
			Repository.createChat(targetChatId, title, true);
		} else {
			Repository.setChatAllowed(targetChatId, true);
			if (title) {
				Repository.updateChatSettings(targetChatId, { title });
			}
		}

		const chatLabel = title
			? `"${title}" (\`${targetChatId}\`)`
			: `group ID \`${targetChatId}\``;
		logger.info(
			`[Commands:allow] Chat permission granted to ${targetChatId} (${title || "No Title"}) by owner ${ctx.from?.id}`,
		);
		await ctx.reply(`[OK] Chat permission granted to ${chatLabel}.`, {
			parse_mode: "Markdown",
		});
	});

	// 5. Admin command: /disallow <chatId> (Owner only)
	bot.command("disallow", async (ctx) => {
		if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) {
			logger.warn(
				`[Commands:disallow] Unauthorized /disallow attempt by user ${ctx.from?.id} (${ctx.from?.first_name})`,
			);
			return;
		}

		const targetChatId = ctx.match?.trim();
		if (!targetChatId) {
			logger.info(
				`[Commands:disallow] Owner ${ctx.from?.id} invoked /disallow with missing chat ID`,
			);
			await ctx.reply("Usage: /disallow <chat_id>");
			return;
		}

		Repository.setChatAllowed(targetChatId, false);
		logger.info(
			`[Commands:disallow] Chat permission revoked for group ID ${targetChatId} by owner ${ctx.from?.id}`,
		);
		await ctx.reply(
			`[Denied] Chat permission revoked for group ID \`${targetChatId}\`.`,
			{ parse_mode: "Markdown" },
		);
	});

	// 6. /prob command to adjust response probability
	bot.command("prob", async (ctx) => {
		if (!ctx.chat) return;

		if (!(await isAuthorized(ctx))) {
			logger.warn(
				`[Commands:prob] Unauthorized /prob attempt by user ${ctx.from?.id} (${ctx.from?.first_name}) in chat ${ctx.chat.id}`,
			);
			await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
			return;
		}

		const matchValue = ctx.match?.trim();
		const chatId = ctx.chat.id.toString();

		if (!matchValue) {
			const chat = Repository.getChat(chatId);
			const currentProbability = Math.round(
				(chat?.reply_probability ?? 0.05) * 100,
			);
			logger.info(
				`[Commands:prob] User ${ctx.from?.id} (${ctx.from?.first_name}) queried probability for chat ${chatId} (${currentProbability}%)`,
			);
			await ctx.reply(
				`Random reply probability is currently ${currentProbability}%. To change it, type: \`/prob 10\` (for 10%).`,
				{ parse_mode: "Markdown" },
			);
			return;
		}

		const probabilityValue = parseInt(matchValue, 10);
		if (
			Number.isNaN(probabilityValue) ||
			probabilityValue < 0 ||
			probabilityValue > 100
		) {
			logger.info(
				`[Commands:prob] User ${ctx.from?.id} (${ctx.from?.first_name}) entered invalid probability "${matchValue}" in chat ${chatId}`,
			);
			await ctx.reply("You must enter a percentage value between 0 and 100.");
			return;
		}

		Repository.updateChatSettings(chatId, {
			reply_probability: probabilityValue / 100,
		});
		logger.info(
			`[Commands:prob] Updated random reply probability to ${probabilityValue}% for chat ${chatId} by user ${ctx.from?.id} (${ctx.from?.first_name})`,
		);
		await ctx.reply(
			`Random reply probability updated to ${probabilityValue}%.`,
		);
	});

	// 7. /model command — switch Gemini model per chat (Owner only)
	bot.command("model", async (ctx) => {
		if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) {
			logger.warn(
				`[Commands:model] Unauthorized /model attempt by user ${ctx.from?.id} (${ctx.from?.first_name})`,
			);
			return;
		}

		const modelName = ctx.match?.trim();

		if (!modelName) {
			logger.info(
				`[Commands:model] Owner ${ctx.from?.id} queried current model (${CONFIG.GEMINI_MODEL})`,
			);
			await ctx.reply(
				`**Current model**: \`${CONFIG.GEMINI_MODEL}\`\n\n` +
					`To change:\n` +
					`\`/model gemini-3.6-flash\`\n` +
					`\`/model gemini-3.1-pro\`\n` +
					`\`/model gemini-3.5-flash-lite\`\n` +
					`\`/model gemini-3.1-flash-lite\``,
				{ parse_mode: "Markdown" },
			);
			return;
		}

		updateModel(modelName);
		logger.info(
			`[Commands:model] Gemini model changed to "${modelName}" by owner ${ctx.from?.id}`,
		);
		await ctx.reply(
			`[OK] Model changed to \`${modelName}\`! New responses will be generated with this model.`,
			{ parse_mode: "Markdown" },
		);
	});

	// 8. /remember command — explicitly save a fact to memory
	bot.command("remember", async (ctx) => {
		if (!ctx.chat || !ctx.from) return;
		const chatIdStr = ctx.chat.id.toString();

		const { fact, userId, userName } = resolveRememberTarget(ctx);
		if (!fact) {
			logger.info(
				`[Commands:remember] User ${ctx.from.id} (${ctx.from.first_name}) invoked /remember with empty fact in chat ${chatIdStr}`,
			);
			await ctx.reply(
				"Usage: `/remember <fact>` or reply to a message with `/remember`.",
				{ parse_mode: "Markdown" },
			);
			return;
		}

		const formattedFact = `${userName}: ${fact}`;
		await processNewMemory(chatIdStr, formattedFact, {
			userId,
			category: "PROFILE",
		});

		logger.info(
			`[Commands:remember] Saved memory for ${userName} (${userId}) in chat ${chatIdStr} by user ${ctx.from.id}: "${fact}"`,
		);

		await ctx.reply(`[OK] Saved memory for ${userName}: "${fact}"`, {
			parse_mode: "Markdown",
		});
	});
}
