import { type Bot, type Context, InlineKeyboard } from "grammy";
import { CONFIG, updateModel } from "../config/index";
import { Repository } from "../db/repository";
import { processNewMemory } from "../services/gemini/memory";
import logger from "../utils/logger";
import { extractTelegramChatTitle, sendLongMessage } from "../utils/message";

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

const MEMORIES_PER_PAGE = 5;
const MAX_MEMORY_DISPLAY_LENGTH = 300;
const TELEGRAM_MAX_LENGTH = 4096;

function getMemDashboardPayload(chatId: string) {
	const memories = Repository.getMemories(chatId);
	const text =
		`**Memory Dashboard** (Total Records: ${memories.length}/10000)\n\n` +
		"Select an option below to view group memories, inspect your saved facts, or manage memory records.";

	const keyboard = new InlineKeyboard()
		.text("All Memories", "mem:page:1")
		.text("My Profile", "mem:user_me")
		.row()
		.text("Help", "mem:help")
		.row()
		.text("Back to Dashboard", "mem:dashboard");

	return { text, keyboard };
}

function getMemoriesPagePayload(chatId: string, page: number = 1) {
	const memories = Repository.getMemories(chatId);
	if (memories.length === 0) {
		const keyboard = new InlineKeyboard().text(
			"Back to Dashboard",
			"mem:dashboard",
		);
		return {
			text: "No saved memories for this group yet.",
			keyboard,
			isEmpty: true,
		};
	}

	const totalPages = Math.ceil(memories.length / MEMORIES_PER_PAGE);
	const currentPage = Math.max(1, Math.min(page, totalPages));

	const startIndex = (currentPage - 1) * MEMORIES_PER_PAGE;
	const pageMemories = memories.slice(
		startIndex,
		startIndex + MEMORIES_PER_PAGE,
	);

	const memoryList = pageMemories
		.map((memory, index) => {
			const text =
				memory.text.length > MAX_MEMORY_DISPLAY_LENGTH
					? `${memory.text.slice(0, MAX_MEMORY_DISPLAY_LENGTH)}...`
					: memory.text;
			return `${startIndex + index + 1}. [ID:${memory.id}] ${text}`;
		})
		.join("\n");

	const header = `**Saved Memories** (${memories.length}/10000) — Page ${currentPage}/${totalPages}:\n\n`;
	const footer = `\n\nTo delete: \`/mem del <id>\``;

	let text = header + memoryList + footer;
	if (text.length > TELEGRAM_MAX_LENGTH) {
		text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 5)}...`;
	}

	const keyboard = new InlineKeyboard();
	if (currentPage > 1) {
		keyboard.text("< Prev", `mem:page:${currentPage - 1}`);
	}
	keyboard.text(`${currentPage}/${totalPages}`, "mem:noop");
	if (currentPage < totalPages) {
		keyboard.text("Next >", `mem:page:${currentPage + 1}`);
	}
	keyboard.row().text("Back to Dashboard", "mem:dashboard");

	return { text, keyboard, isEmpty: false };
}

async function handleMemMe(ctx: Context, chatId: string): Promise<void> {
	if (!ctx.from) return;
	const userMemories = Repository.getUserMemories(chatId, ctx.from.id);
	if (userMemories.length === 0) {
		await ctx.reply(
			`No specific profile facts saved for you (${ctx.from.first_name}) yet.`,
		);
		return;
	}
	const list = userMemories
		.map((m, i) => `${i + 1}. [ID:${m.id}] ${m.text}`)
		.join("\n");
	await sendLongMessage(
		ctx,
		`**Saved Facts for ${ctx.from.first_name}:**\n\n${list}`,
		{ parse_mode: "Markdown" },
	);
}

async function handleMemClear(ctx: Context, chatId: string): Promise<void> {
	if (!(await isOwnerOrCreator(ctx))) {
		await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
		return;
	}
	Repository.clearMemories(chatId);
	await ctx.reply("All memories for this group have been cleared.");
}

async function handleMemDelete(
	ctx: Context,
	chatId: string,
	lowerArg: string,
): Promise<void> {
	const parts = lowerArg.split(" ");
	const targetId = parseInt(parts[1], 10);
	if (Number.isNaN(targetId)) {
		await ctx.reply("Usage: `/mem del <id>` — e.g. `/mem del 42`", {
			parse_mode: "Markdown",
		});
		return;
	}
	Repository.deleteMemoriesByIds([targetId], chatId);
	await ctx.reply(`[OK] Memory ID \`${targetId}\` has been deleted.`, {
		parse_mode: "Markdown",
	});
}

async function handleMemByIndex(
	ctx: Context,
	chatId: string,
	indexNum: number,
): Promise<void> {
	const index = indexNum - 1;
	const memories = Repository.getMemories(chatId);
	if (memories.length === 0) {
		await ctx.reply("No saved memories for this group yet.");
		return;
	}
	if (index < 0 || index >= memories.length) {
		await ctx.reply(
			`Invalid number. Total memories: ${memories.length}. Enter 1 to ${memories.length}.`,
		);
		return;
	}
	const memory = memories[index];
	const header = `**Memory #${index + 1}** (of ${memories.length}) [ID:${memory.id}]:\n\n`;
	await sendLongMessage(ctx, header + memory.text, {
		parse_mode: "Markdown",
	});
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

async function sendOrEditCallback(
	ctx: Context,
	payload: { text: string; keyboard: InlineKeyboard },
): Promise<void> {
	try {
		await ctx.editMessageText(payload.text, {
			parse_mode: "Markdown",
			reply_markup: payload.keyboard,
		});
	} catch {}
	await ctx.answerCallbackQuery().catch(() => {});
}

export function registerCommandHandlers(bot: Bot) {
	// 1. /start command
	bot.command("start", async (ctx) => {
		await ctx.reply(
			"Hi! I am an LLM-powered AI bot. I track group history, " +
				"answer your questions, recognize photos, listen to voice messages, and participate in conversations.",
		);
	});

	// 2. /help command
	bot.command("help", async (ctx) => {
		await ctx.reply(
			"Available Commands & Capabilities:\n\n" +
				"**Chat**: I respond if you reply to me directly or mention me in your message.\n" +
				"**Spontaneous Participation**: I occasionally chime in on the group conversation.\n" +
				"**Image & Voice Recognition**: I understand photos and listen to voice messages.\n" +
				"**Management Commands**:\n" +
				"• `/app` or `/admin` — Open Web Mini App Dashboard\n" +
				"• `/mem` — Open interactive memory dashboard\n" +
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
				await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
				return;
			}

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
			logger.error("[Commands] Error handling /app or /admin:", error);
		}
	});

	// 3. /reset command
	bot.command("reset", async (ctx) => {
		if (!ctx.chat) return;

		if (!(await isOwnerOrCreator(ctx))) {
			await ctx.reply(CONFIG.MESSAGES.not_authorized_command);
			return;
		}

		const chatId = ctx.chat.id.toString();
		Repository.clearChatHistory(chatId);
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
		if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) return;

		const targetChatId = ctx.match?.trim();
		if (!targetChatId) {
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
		await ctx.reply(`[OK] Chat permission granted to ${chatLabel}.`, {
			parse_mode: "Markdown",
		});
	});

	// 5. Admin command: /disallow <chatId> (Owner only)
	bot.command("disallow", async (ctx) => {
		if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) return;

		const targetChatId = ctx.match?.trim();
		if (!targetChatId) {
			await ctx.reply("Usage: /disallow <chat_id>");
			return;
		}

		Repository.setChatAllowed(targetChatId, false);
		await ctx.reply(
			`[Denied] Chat permission revoked for group ID \`${targetChatId}\`.`,
			{ parse_mode: "Markdown" },
		);
	});

	// 6. /prob command to adjust response probability
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
			const currentProbability = Math.round(
				(chat?.reply_probability ?? 0.05) * 100,
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
			await ctx.reply("You must enter a percentage value between 0 and 100.");
			return;
		}

		Repository.updateChatSettings(chatId, {
			reply_probability: probabilityValue / 100,
		});
		await ctx.reply(
			`Random reply probability updated to ${probabilityValue}%.`,
		);
	});

	// 7. /mem command
	bot.command("mem", async (ctx) => {
		if (!ctx.chat || !ctx.from) return;
		const chatId = ctx.chat.id.toString();
		const arg = ctx.match?.trim() || "";

		if (!arg) {
			const payload = getMemDashboardPayload(chatId);
			await ctx.reply(payload.text, {
				parse_mode: "Markdown",
				reply_markup: payload.keyboard,
			});
			return;
		}

		const lowerArg = arg.toLowerCase();
		if (lowerArg === "me") {
			return handleMemMe(ctx, chatId);
		}
		if (lowerArg === "clear") {
			return handleMemClear(ctx, chatId);
		}
		if (lowerArg.startsWith("del ") || lowerArg.startsWith("forget ")) {
			return handleMemDelete(ctx, chatId, lowerArg);
		}

		const parsedInt = parseInt(arg, 10);
		if (!Number.isNaN(parsedInt)) {
			return handleMemByIndex(ctx, chatId, parsedInt);
		}

		await ctx.reply(
			"Usage:\n" +
				"• `/mem` — Open memory dashboard\n" +
				"• `/mem me` — View facts saved about you\n" +
				"• `/mem del <id>` — Delete memory by ID\n" +
				"• `/mem <number>` — View full text of memory #number",
			{ parse_mode: "Markdown" },
		);
	});

	const backToDashboardKeyboard = new InlineKeyboard().text(
		"Back to Dashboard",
		"mem:dashboard",
	);

	// Callback queries for /mem inline keyboard
	bot.callbackQuery("mem:dashboard", async (ctx) => {
		if (!ctx.chat) return;
		const chatId = ctx.chat.id.toString();
		await sendOrEditCallback(ctx, getMemDashboardPayload(chatId));
	});

	bot.callbackQuery(/^mem:page:(\d+)$/, async (ctx) => {
		if (!ctx.chat) return;
		const chatId = ctx.chat.id.toString();
		const targetPage = parseInt(ctx.match[1], 10);
		await sendOrEditCallback(ctx, getMemoriesPagePayload(chatId, targetPage));
	});

	bot.callbackQuery("mem:user_me", async (ctx) => {
		if (!ctx.chat || !ctx.from) return;
		const chatId = ctx.chat.id.toString();
		const userMemories = Repository.getUserMemories(chatId, ctx.from.id);

		let text = "";
		if (userMemories.length === 0) {
			text = `No specific profile facts saved for you (${ctx.from.first_name}) yet.`;
		} else {
			const list = userMemories
				.map((m, i) => `${i + 1}. [ID:${m.id}] ${m.text}`)
				.join("\n");
			text = `**Saved Facts for ${ctx.from.first_name}:**\n\n${list}`;
		}

		await sendOrEditCallback(ctx, {
			text,
			keyboard: backToDashboardKeyboard,
		});
	});

	bot.callbackQuery("mem:help", async (ctx) => {
		const text =
			"**How to Add Memories**\n\n" +
			"1. Use command: `/remember <fact>`\n" +
			"2. Or reply to any user message with `/remember` to save it.\n" +
			"3. Natural phrases like *'remember this'*, *'keep in mind'*, *'note this'* will also be automatically extracted.\n\n" +
			"**How to Delete Memories**\n\n" +
			"1. Type `/mem del <id>` (e.g., `/mem del 42`).\n" +
			"2. Admins can clear all group memories using `/mem clear`.";

		await sendOrEditCallback(ctx, {
			text,
			keyboard: backToDashboardKeyboard,
		});
	});

	bot.callbackQuery("mem:noop", async (ctx) => {
		await ctx.answerCallbackQuery().catch(() => {});
	});

	// 8. /model command — switch Gemini model per chat (Owner only)
	bot.command("model", async (ctx) => {
		if (!CONFIG.BOT_OWNER_ID || ctx.from?.id !== CONFIG.BOT_OWNER_ID) return;

		const modelName = ctx.match?.trim();

		if (!modelName) {
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
		await ctx.reply(
			`[OK] Model changed to \`${modelName}\`! New responses will be generated with this model.`,
			{ parse_mode: "Markdown" },
		);
	});

	// 9. /remember command — explicitly save a fact to memory
	bot.command("remember", async (ctx) => {
		if (!ctx.chat || !ctx.from) return;
		const chatIdStr = ctx.chat.id.toString();

		const { fact, userId, userName } = resolveRememberTarget(ctx);
		if (!fact) {
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

		await ctx.reply(`[OK] Saved memory for ${userName}: "${fact}"`, {
			parse_mode: "Markdown",
		});
	});
}
