import { type Bot, type Context, InputFile } from "grammy";
import { CONFIG } from "../config";
import { Repository } from "../db/repository";
import { botUsername, withChatLock, withTyping } from "../services/bot";
import {
	GeminiService,
	type GeneratedMediaArtifact,
	type ToolProgressUpdate,
} from "../services/gemini/index";
import { checkAndRunBackgroundMemoryExtraction } from "../services/gemini/memoryWorker";
import { isConversationFollowUp } from "../utils/conversation";
import logger from "../utils/logger";
import {
	downloadTelegramFileById,
	extractPhotoFileId,
	isDownloadError,
} from "../utils/mediaDownloader";
import { sendLongMessage } from "../utils/message";

const COOLDOWN_SECONDS = 300; // 5 minutes cooldown between random replies

async function resolveRepliedPhoto(
	ctx: Context,
	chatIdStr: string,
): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
	const replyToMsg = ctx.message?.reply_to_message;
	if (!replyToMsg) return undefined;

	let photoFileId = extractPhotoFileId(replyToMsg.photo);
	if (!photoFileId && replyToMsg.document?.mime_type?.startsWith("image/")) {
		photoFileId = replyToMsg.document.file_id;
	}
	if (!photoFileId && replyToMsg.message_id) {
		const dbMsg = Repository.getMessage(chatIdStr, replyToMsg.message_id);
		if (dbMsg?.photo_file_id) {
			photoFileId = dbMsg.photo_file_id;
		}
	}

	if (!photoFileId) return undefined;

	logger.info(
		`[Chat] Reply to photo message detected (file_id: ${photoFileId}). Downloading image...`,
	);
	try {
		const downloadResult = await downloadTelegramFileById(
			ctx,
			photoFileId,
			"photo",
		);
		if (!isDownloadError(downloadResult)) {
			logger.info(
				`[Chat] Successfully downloaded replied photo (${downloadResult.buffer.length} bytes)`,
			);
			return {
				buffer: downloadResult.buffer,
				mimeType: "image/jpeg",
			};
		}
		logger.warn(
			`[Chat] Failed to download replied photo: ${downloadResult.error}`,
		);
	} catch (err) {
		logger.error("[Chat] Error downloading replied photo:", err);
	}
	return undefined;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getArtifactEmoji(type: string, filename: string): string {
	if (type === "image") return "📊";
	if (type === "video") return "🎬";
	if (type === "audio") return "🎵";
	const lower = filename.toLowerCase();
	if (
		lower.endsWith(".xlsx") ||
		lower.endsWith(".xls") ||
		lower.endsWith(".csv")
	) {
		return "📈";
	}
	if (lower.endsWith(".pdf")) return "📑";
	if (
		lower.endsWith(".zip") ||
		lower.endsWith(".tar") ||
		lower.endsWith(".gz")
	) {
		return "🗜️";
	}
	return "📁";
}

function normalizeLanguageName(raw?: unknown): string {
	if (typeof raw !== "string") return "script";
	const lower = raw.toLowerCase();
	if (lower === "python") return "Python";
	if (lower === "typescript") return "TypeScript";
	if (lower === "javascript") return "JavaScript";
	if (lower === "bash" || lower === "sh") return "Bash";
	return raw;
}

function resolveExecuteCodeMessage(args: Record<string, unknown>): string {
	const packages = Array.isArray(args.packages)
		? (args.packages as string[])
		: [];
	const lang = normalizeLanguageName(args.language);
	const filename =
		typeof args.filename === "string" ? ` (${args.filename})` : "";
	if (packages.length > 0) {
		const pkgList = packages.slice(0, 3).join(", ");
		const suffix = packages.length > 3 ? "..." : "";
		return `📦 Installing dependencies (${pkgList}${suffix}) & running ${lang}${filename}...`;
	}
	return `⚡ Executing ${lang} script${filename} in sandbox...`;
}

function resolveToolStatusMessage(
	toolName: string,
	args: Record<string, unknown> = {},
): string {
	if (toolName === "web_search") {
		return CONFIG.MESSAGES.tool_status_web_search || "🔍 Searching the web...";
	}

	if (toolName === "execute_code") {
		return resolveExecuteCodeMessage(args);
	}

	const filename = typeof args.filename === "string" ? args.filename : "file";
	switch (toolName) {
		case "read_workspace_file":
			return `📄 Reading workspace file (${filename})...`;
		case "write_workspace_file":
			return `✏️ Writing workspace file (${filename})...`;
		case "list_workspace_files":
			return "📁 Scanning session workspace files...";
		case "reset_workspace":
			return "🧹 Cleaning and resetting session workspace...";
		default:
			return `Spawning subagent for (${toolName})...`;
	}
}

function extractRecentStdoutSnippet(fullStdout?: string, maxLines = 3): string {
	if (!fullStdout) return "";
	const lines = fullStdout
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	if (lines.length === 0) return "";
	const recent = lines.slice(-maxLines);
	return recent
		.map((l) => `> ${l.length > 70 ? `${l.slice(0, 67)}...` : l}`)
		.join("\n");
}

function createToolNotifier(
	ctx: Context,
	replyToMessageId?: number,
	logPrefix: string = "[Chat]",
) {
	let statusMessageId: number | undefined;
	let currentBaseStatus = "";
	let currentStdout = "";
	let lastEditTime = 0;
	let throttleTimer: ReturnType<typeof setTimeout> | null = null;
	let latestRenderedText = "";
	let isCleanedUp = false;

	const flushEdit = async () => {
		if (isCleanedUp || !statusMessageId || !ctx.chat || !latestRenderedText) {
			return;
		}
		const textToSend = latestRenderedText;
		lastEditTime = Date.now();
		try {
			await ctx.api.editMessageText(ctx.chat.id, statusMessageId, textToSend);
		} catch (e) {
			logger.debug(`${logPrefix} Failed to edit status message:`, e);
		}
	};

	const queueUpdate = (newText: string) => {
		if (isCleanedUp) return;
		latestRenderedText = newText;
		const now = Date.now();
		const elapsed = now - lastEditTime;

		if (elapsed >= 1500) {
			if (throttleTimer) {
				clearTimeout(throttleTimer);
				throttleTimer = null;
			}
			flushEdit();
		} else if (!throttleTimer) {
			throttleTimer = setTimeout(() => {
				throttleTimer = null;
				flushEdit();
			}, 1500 - elapsed);
		}
	};

	return {
		onToolCall: async (
			toolName: string,
			args: Record<string, unknown> = {},
			_step?: number,
		) => {
			if (isCleanedUp) return;
			currentBaseStatus = resolveToolStatusMessage(toolName, args);
			currentStdout = "";

			if (statusMessageId && ctx.chat) {
				logger.info(
					`${logPrefix} Updating tool status notification: "${currentBaseStatus}"`,
				);
				queueUpdate(currentBaseStatus);
				return;
			}

			logger.info(
				`${logPrefix} Sending tool status notification: "${currentBaseStatus}"`,
			);

			const sentMsg = await ctx
				.reply(
					currentBaseStatus,
					replyToMessageId
						? { reply_to_message_id: replyToMessageId }
						: undefined,
				)
				.catch((e) => {
					logger.warn(`${logPrefix} Failed to send status message:`, e);
					return null;
				});

			if (sentMsg) {
				statusMessageId = sentMsg.message_id;
				lastEditTime = Date.now();
			}
		},
		onToolProgress: async (
			_toolName: string,
			progress: ToolProgressUpdate,
			_step?: number,
		) => {
			if (isCleanedUp) return;
			if (progress.statusText) {
				currentBaseStatus = `⚡ ${progress.statusText}`;
			}
			if (progress.fullStdout) {
				currentStdout = progress.fullStdout;
			}

			const snippet = extractRecentStdoutSnippet(currentStdout);
			const fullMessage = snippet
				? `${currentBaseStatus}\n────────────────────────\n${snippet}`
				: currentBaseStatus;

			queueUpdate(fullMessage);
		},
		cleanup: async () => {
			isCleanedUp = true;
			if (throttleTimer) {
				clearTimeout(throttleTimer);
				throttleTimer = null;
			}
			if (statusMessageId && ctx.chat) {
				await ctx.api.deleteMessage(ctx.chat.id, statusMessageId).catch((e) => {
					logger.warn(`${logPrefix} Failed to delete status message:`, e);
				});
			}
		},
	};
}

async function sendSingleArtifact(
	ctx: Context,
	art: GeneratedMediaArtifact,
	replyToMessageId?: number,
): Promise<void> {
	const sizeText = formatFileSize(art.sizeBytes || art.buffer.length);
	const emoji = getArtifactEmoji(art.type, art.filename);
	const caption = `${emoji} ${art.filename} (${sizeText})`;
	const inputFile = new InputFile(art.buffer, art.filename);
	const replyParams = replyToMessageId
		? { reply_to_message_id: replyToMessageId }
		: undefined;

	try {
		if (art.type === "image") {
			await ctx.replyWithPhoto(inputFile, { caption, ...replyParams });
		} else if (art.type === "video") {
			await ctx.replyWithVideo(inputFile, { caption, ...replyParams });
		} else if (art.type === "audio") {
			await ctx.replyWithAudio(inputFile, { caption, ...replyParams });
		} else {
			await ctx.replyWithDocument(inputFile, { caption, ...replyParams });
		}
	} catch (err) {
		logger.warn(
			`[Chat] Failed to send generated artifact (${art.filename}) as ${art.type}:`,
			err,
		);
		try {
			await ctx.replyWithDocument(inputFile, { caption, ...replyParams });
		} catch (fallbackErr) {
			logger.error(
				`[Chat] Fallback document delivery also failed for ${art.filename}:`,
				fallbackErr,
			);
		}
	}
}

async function generateAndSendReply(
	ctx: Context,
	chatIdStr: string,
	isSpontaneous: boolean,
	replyToMessageId?: number,
): Promise<void> {
	const chatSettings = Repository.getChat(chatIdStr);
	if (!chatSettings) return;

	// Concurrency: fetch active topic, history, and replied photo in parallel
	const [activeTopic, history, mediaPayload] = await Promise.all([
		GeminiService.ensureTopicSummary(chatIdStr, chatSettings.current_topic),
		Promise.resolve(
			Repository.getRecentMessages(chatIdStr, CONFIG.CHAT_HISTORY_LIMIT),
		),
		resolveRepliedPhoto(ctx, chatIdStr),
	]);

	const logPrefix = isSpontaneous ? "[Spontaneous]" : "[Chat]";
	const notifier = createToolNotifier(ctx, replyToMessageId, logPrefix);
	const generatedArtifacts: GeneratedMediaArtifact[] = [];

	const reply = await GeminiService.generateReply(
		history,
		activeTopic,
		isSpontaneous,
		notifier.onToolCall,
		chatIdStr,
		mediaPayload,
		async (media) => {
			generatedArtifacts.push(...media);
		},
		notifier.onToolProgress,
	);

	// Send generated artifacts (Photos, Spreadsheets, PDF reports, Videos, Audio)
	for (const art of generatedArtifacts) {
		await sendSingleArtifact(ctx, art, replyToMessageId);
	}

	// Send final reply
	await sendLongMessage(
		ctx,
		reply,
		replyToMessageId ? { reply_to_message_id: replyToMessageId } : undefined,
	);

	// Delete the temporary status message after final answer is sent
	await notifier.cleanup();
}

function checkDirectInteraction(
	text: string,
	msg: NonNullable<Context["message"]>,
	from: NonNullable<Context["from"]>,
	chat: NonNullable<Context["chat"]>,
	chatIdStr: string,
): boolean {
	const botName = botUsername || "ket";
	const nicknameRegex = new RegExp(
		`\\b${botName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
		"i",
	);
	const containsNickname = nicknameRegex.test(text) || /\bket\b/i.test(text);
	const isMentioned = text.includes(`@${botUsername}`);
	const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;
	const isPrivateChat = chat.type === "private";

	const isFollowUp = isConversationFollowUp(chatIdStr, from.id, msg.date);
	if (isFollowUp) {
		logger.debug(
			`[Conversation] Follow-up detected for user ${from.first_name} in chat ${chatIdStr}`,
		);
	}

	return (
		isMentioned ||
		isReplyToBot ||
		isPrivateChat ||
		containsNickname ||
		isFollowUp
	);
}

async function trySpontaneousReply(
	ctx: Context,
	chatIdStr: string,
	chatSettings: NonNullable<ReturnType<typeof Repository.getChat>>,
): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	const lastRandomReply = chatSettings.last_random_reply_at || 0;
	if (now - lastRandomReply < COOLDOWN_SECONDS) return;

	const roll = Math.random();
	if (roll >= chatSettings.reply_probability) return;

	logger.info(
		`[Spontaneous] Rolling SUCCESS for chat ${chatIdStr} (Roll: ${roll.toFixed(4)} < ${chatSettings.reply_probability})`,
	);

	Repository.updateChatSettings(chatIdStr, {
		last_random_reply_at: now,
	});

	await withChatLock(chatIdStr, () =>
		withTyping(ctx, () => generateAndSendReply(ctx, chatIdStr, true)),
	);
}

export function registerChatHandlers(bot: Bot) {
	// Listen to all text messages (non-commands)
	bot.on("message:text", async (ctx) => {
		const text = ctx.message.text;

		// Ignore commands (starts with '/')
		if (text.startsWith("/")) return;

		const chat = ctx.chat;
		const msg = ctx.message;
		const from = ctx.from;
		if (!chat || !msg || !from) return;

		const chatIdStr = chat.id.toString();

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});

		const isDirectInteraction = checkDirectInteraction(
			text,
			msg,
			from,
			chat,
			chatIdStr,
		);

		// Get chat configuration
		const chatSettings = Repository.getChat(chatIdStr);
		if (!chatSettings) return;

		if (isDirectInteraction) {
			// Direct interaction: reply immediately, serialized per chat
			await withChatLock(chatIdStr, () =>
				withTyping(ctx, () =>
					generateAndSendReply(ctx, chatIdStr, false, msg.message_id),
				),
			);
			return;
		}

		// Check if we should trigger spontaneous participation (real users only)
		if (!from.is_bot) {
			await trySpontaneousReply(ctx, chatIdStr, chatSettings);
		}
	});
}
