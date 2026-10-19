import type { Bot, Context } from "grammy";
import { resetWorkspace } from "../agent/tools/workspaceTools";
import { buildMiniAppKeyboard } from "../bot/ui/index";
import { CONFIG } from "../config/index";
import { Repository } from "../db/repository";
import { abortGeneration } from "../services/bot/generation";
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
	bot.command("start", async (ctx) => {
		logger.info(
			`[Commands:start] User ${ctx.from?.id} (${ctx.from?.first_name}) invoked /start in chat ${ctx.chat?.id}`,
		);
		await ctx.reply(
			"Hi! I am an LLM-powered AI bot. I track group history, " +
				"answer your questions, recognize photos, listen to voice messages, and participate in conversations.",
		);
	});

	bot.command("help", async (ctx) => {
		logger.info(
			`[Commands:help] User ${ctx.from?.id} (${ctx.from?.first_name}) invoked /help in chat ${ctx.chat?.id}`,
		);
		await ctx.reply(
			"Available Commands & Capabilities:\n\n" +
				"**Chat**: I respond if you reply to me directly or mention me in your message.\n" +
				"**Spontaneous Participation**: I occasionally chime in on the group conversation when I have something relevant or witty to add.\n" +
				"**Image & Voice Recognition**: I understand photos and listen to voice messages.\n" +
				"**Management Commands**:\n" +
				"• `/app` or `/admin` — Open Web Mini App Dashboard\n" +
				"• `/remember <fact>` — Save a new fact to memory\n" +
				"• `/spontaneous [on|off]` — Toggle spontaneous replies on or off (Admin)\n" +
				"• `/prob [0-100|on|off]` — Set random reply probability (Admin)\n" +
				"• `/reset` — Clear chat history and memory (Admin)\n" +
				"• `/stop` — Cancel an in-progress response\n\n" +
				"**Privacy Commands**:\n" +
				"• `/optout` — Completely opt-out from bot processing & memories\n" +
				"• `/optin` — Opt back in to bot interactions",
			{ parse_mode: "Markdown" },
		);
	});

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

			const isPrivate = ctx.chat?.type === "private";
			const botUsername = ctx.me?.username || "";
			const keyboard = buildMiniAppKeyboard(isPrivate, botUsername);

			await ctx.reply(
				"Click the button below to open the Admin & Memory Dashboard:",
				{ reply_markup: keyboard },
			);
		} catch (error) {
			logger.error("[Commands:app] Error handling /app or /admin:", error);
		}
	});

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
		resetWorkspace({ sessionId: chatId }).catch(() => {});

		logger.info(
			`[Commands:reset] Cleared chat history, memories, and sandbox workspace for chat ${chatId} by user ${ctx.from?.id} (${ctx.from?.first_name})`,
		);
		await ctx.reply(
			"Chat history, group memories, and sandbox workspace cleared successfully.",
		);
	});

	bot.command(["reset_sandbox", "clear_session"], async (ctx) => {
		if (!ctx.chat) return;

		if (!(await isAuthorized(ctx))) {
			logger.warn(
				`[Commands:reset_sandbox] Unauthorized attempt by user ${ctx.from?.id} in chat ${ctx.chat.id}`,
			);
			await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
			return;
		}

		const chatId = ctx.chat.id.toString();
		await resetWorkspace({ sessionId: chatId });
		logger.info(
			`[Commands:reset_sandbox] Reset sandbox workspace for chat ${chatId} by user ${ctx.from?.id}`,
		);
		await ctx.reply("🧹 Sandbox workspace files cleared successfully.");
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

	bot.command("stop", async (ctx) => {
		if (!ctx.chat) return;
		const chatId = ctx.chat.id.toString();
		const aborted = abortGeneration(chatId);
		logger.info(
			`[Commands:stop] User ${ctx.from?.id} (${ctx.from?.first_name}) requested stop in chat ${chatId} (aborted: ${aborted})`,
		);
		await ctx.reply(
			aborted
				? "Stopped the current response."
				: "Nothing is running right now.",
			{ reply_to_message_id: ctx.message?.message_id },
		);
	});

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

	function parseToggleArg(arg?: string): boolean | null {
		if (!arg) return null;
		if (arg === "on" || arg === "enable" || arg === "1" || arg === "true") {
			return true;
		}
		if (arg === "off" || arg === "disable" || arg === "0" || arg === "false") {
			return false;
		}
		return null;
	}

	async function replySpontaneousStatus(
		ctx: Context,
		chatId: string,
	): Promise<void> {
		const chat = Repository.getChat(chatId);
		const isEnabled = (chat?.spontaneous_enabled ?? 1) !== 0;
		const pct = Math.round((chat?.reply_probability ?? 0.05) * 100);
		const globalNote = !CONFIG.ENABLE_SPONTANEOUS_REPLIES
			? " _(Note: globally disabled by bot owner)_"
			: "";

		await ctx.reply(
			`Spontaneous replies are currently **${isEnabled ? "ON" : "OFF"}**${globalNote} (probability: ${pct}%).\nUsage: \`/spontaneous on\` or \`/spontaneous off\``,
			{ parse_mode: "Markdown" },
		);
	}

	async function handleSpontaneousToggle(
		ctx: Context,
		chatId: string,
		enable: boolean,
	): Promise<void> {
		const chat = Repository.getChat(chatId);
		const currentProb = chat?.reply_probability ?? 0.05;
		const needsDefaultProb = enable && currentProb <= 0;
		const nextProb = needsDefaultProb
			? CONFIG.DEFAULT_REPLY_PROBABILITY || 0.05
			: currentProb;

		Repository.updateChatSettings(chatId, {
			spontaneous_enabled: enable,
			...(needsDefaultProb ? { reply_probability: nextProb } : {}),
		});

		const pct = Math.round(nextProb * 100);
		logger.info(
			`[Commands:spontaneous] Spontaneous replies turned ${enable ? "ON" : "OFF"} (${pct}%) for chat ${chatId} by user ${ctx.from?.id} (${ctx.from?.first_name})`,
		);
		await ctx.reply(
			enable
				? `Spontaneous replies turned **ON** (probability: ${pct}%).`
				: "Spontaneous replies turned **OFF**. I will only reply when mentioned or replied to directly.",
			{ parse_mode: "Markdown" },
		);
	}

	bot.command(["spontaneous", "chime"], async (ctx) => {
		if (!ctx.chat) return;
		if (!(await isAuthorized(ctx))) {
			await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
			return;
		}

		const chatId = ctx.chat.id.toString();
		const arg = ctx.match?.trim().toLowerCase();
		if (!arg) {
			await replySpontaneousStatus(ctx, chatId);
			return;
		}

		const toggleVal = parseToggleArg(arg);
		if (toggleVal !== null) {
			await handleSpontaneousToggle(ctx, chatId, toggleVal);
			return;
		}

		await ctx.reply("Usage: `/spontaneous on` or `/spontaneous off`", {
			parse_mode: "Markdown",
		});
	});

	async function applyProbabilityPercentage(
		ctx: Context,
		chatId: string,
		matchValue: string,
	): Promise<void> {
		const probabilityValue = parseInt(matchValue, 10);
		if (
			Number.isNaN(probabilityValue) ||
			probabilityValue < 0 ||
			probabilityValue > 100
		) {
			await ctx.reply(
				"Enter a percentage between 0 and 100, or `on` / `off`.",
				{ parse_mode: "Markdown" },
			);
			return;
		}

		const nextEnabled = probabilityValue > 0;
		Repository.updateChatSettings(chatId, {
			reply_probability: probabilityValue / 100,
			spontaneous_enabled: nextEnabled,
		});
		logger.info(
			`[Commands:prob] Updated random reply probability to ${probabilityValue}% (enabled: ${nextEnabled}) for chat ${chatId} by user ${ctx.from?.id}`,
		);
		await ctx.reply(
			nextEnabled
				? `Spontaneous reply probability updated to ${probabilityValue}% (**ON**).`
				: "Spontaneous replies turned **OFF** (0%).",
			{ parse_mode: "Markdown" },
		);
	}

	bot.command("prob", async (ctx) => {
		if (!ctx.chat) return;
		if (!(await isAuthorized(ctx))) {
			await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
			return;
		}

		const matchValue = ctx.match?.trim().toLowerCase();
		const chatId = ctx.chat.id.toString();

		if (!matchValue) {
			await replySpontaneousStatus(ctx, chatId);
			return;
		}

		const toggleVal = parseToggleArg(matchValue);
		if (toggleVal !== null) {
			await handleSpontaneousToggle(ctx, chatId, toggleVal);
			return;
		}

		await applyProbabilityPercentage(ctx, chatId, matchValue);
	});

	bot.command("remember", async (ctx) => {
		if (!ctx.chat || !ctx.from) return;
		const chatIdStr = ctx.chat.id.toString();

		const { fact, userId, userName } = resolveRememberTarget(ctx);
		if (
			Repository.isUserOptedOut(userId) ||
			(userName && Repository.isUsernameOptedOut(userName))
		) {
			logger.info(
				`[Commands:remember] Denied memory save for opted-out user ${userId} (${userName}) in chat ${chatIdStr}`,
			);
			await ctx.reply(
				`Cannot save memory: ${userName} has opted out of bot memory and processing.`,
				{ reply_to_message_id: ctx.message?.message_id },
			);
			return;
		}

		if (!fact) {
			logger.info(
				`[Commands:remember] User ${ctx.from.id} (${ctx.from.first_name}) invoked /remember with empty fact in chat ${chatIdStr}`,
			);
			await ctx.reply(
				"Usage: `/remember <fact>` or reply to a message with `/remember`.",
				{
					parse_mode: "Markdown",
					reply_to_message_id: ctx.message?.message_id,
				},
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
			reply_to_message_id: ctx.message?.message_id,
		});
	});

	bot.command(["optout", "opt_out"], async (ctx) => {
		if (!ctx.from) return;
		const userId = ctx.from.id;
		const userName = ctx.from.first_name || "User";

		if (Repository.isUserOptedOut(userId)) {
			await ctx.reply(
				"You are already opted out. I am completely ignoring your messages and will not store any memories. Use /optin to opt back in.",
				{ reply_to_message_id: ctx.message?.message_id },
			);
			return;
		}

		Repository.setUserOptOut(userId, true, {
			username: ctx.from.username,
			firstName: ctx.from.first_name,
		});

		logger.info(
			`[Commands:optout] User ${userId} (${userName}) opted out in chat ${ctx.chat?.id}`,
		);
		await ctx.reply(
			"You have successfully opted out. I will completely ignore your messages, voice, and photos, and will not store memories or respond to you in any chat. To opt back in, send /optin.",
			{ reply_to_message_id: ctx.message?.message_id },
		);
	});

	bot.command(["optin", "opt_in"], async (ctx) => {
		if (!ctx.from) return;
		const userId = ctx.from.id;
		const userName = ctx.from.first_name || "User";

		if (!Repository.isUserOptedOut(userId)) {
			await ctx.reply(
				"You are already opted in. I am actively participating and responding to your messages.",
				{ reply_to_message_id: ctx.message?.message_id },
			);
			return;
		}

		Repository.setUserOptOut(userId, false, {
			username: ctx.from.username,
			firstName: ctx.from.first_name,
		});

		logger.info(
			`[Commands:optin] User ${userId} (${userName}) opted back in in chat ${ctx.chat?.id}`,
		);
		await ctx.reply(
			"You have successfully opted back in! I will now process your messages, respond when mentioned, and interact normally.",
			{ reply_to_message_id: ctx.message?.message_id },
		);
	});
}
