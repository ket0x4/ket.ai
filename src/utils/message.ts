import type { Context } from "grammy";
import type { ParseMode } from "grammy/types";
import logger from "./logger";

const TELEGRAM_MAX_LENGTH = 4096;

function findSplitPoint(text: string, limit: number): number {
	const minThreshold = limit * 0.5;

	// Prefer splitting at a paragraph break
	const paraBreak = text.lastIndexOf("\n\n", limit);
	if (paraBreak > minThreshold) {
		return paraBreak + 2;
	}

	// Fall back to a newline
	const lineBreak = text.lastIndexOf("\n", limit);
	if (lineBreak > minThreshold) {
		return lineBreak + 1;
	}

	// Last resort: split at a space
	const spaceBreak = text.lastIndexOf(" ", limit);
	if (spaceBreak > minThreshold) {
		return spaceBreak + 1;
	}

	return limit;
}

/**
 * Ensures code fences (```) spanning across split message chunks are properly closed
 * at chunk ends and reopened at the start of subsequent chunks for valid Telegram Markdown.
 */
export function balanceCodeFences(chunks: string[]): string[] {
	const result: string[] = [];
	let openCodeLanguage: string | null = null;

	for (let i = 0; i < chunks.length; i++) {
		let chunk = chunks[i];

		// If previous chunk left an open code fence, prepend opening fence
		if (openCodeLanguage !== null) {
			chunk = `\`\`\`${openCodeLanguage}\n${chunk}`;
		}

		// Count code fences in current chunk to see if it leaves an open fence
		const fenceMatches = Array.from(chunk.matchAll(/```([a-zA-Z0-9_-]*)/g));
		const isOdd = fenceMatches.length % 2 !== 0;

		if (isOdd) {
			// Find language of the last opening fence
			const lastFence = fenceMatches[fenceMatches.length - 1];
			openCodeLanguage = lastFence ? lastFence[1] || "" : "";
			// Append closing fence to current chunk
			chunk = `${chunk}\n\`\`\``;
		} else {
			openCodeLanguage = null;
		}

		result.push(chunk);
	}

	return result;
}

/**
 * Splits text into chunks that respect Telegram's 4096-character message limit.
 * Tries to split on paragraph or sentence boundaries to avoid cutting mid-sentence.
 */
export function splitMessage(text: string): string[] {
	if (!text?.trim()) return [];
	if (text.length <= TELEGRAM_MAX_LENGTH) return [text];

	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > TELEGRAM_MAX_LENGTH) {
		const splitAt = findSplitPoint(remaining, TELEGRAM_MAX_LENGTH);
		chunks.push(remaining.slice(0, splitAt).trimEnd());
		remaining = remaining.slice(splitAt).trimStart();
	}

	if (remaining.length > 0) {
		chunks.push(remaining);
	}

	return chunks;
}

interface SendOptions {
	reply_to_message_id?: number;
	edit_message_id?: number;
	parse_mode?: ParseMode;
}

async function tryEditStatusMessage(
	ctx: Context,
	chatId: number,
	messageId: number,
	chunk: string,
	parseMode?: ParseMode,
): Promise<boolean> {
	try {
		await ctx.api.editMessageText(chatId, messageId, chunk, {
			parse_mode: parseMode,
		});
		return true;
	} catch (e) {
		logger.warn(
			"[Message] Failed to edit status message with parse_mode, trying plain text fallback:",
			e,
		);
		if (parseMode) {
			try {
				await ctx.api.editMessageText(chatId, messageId, chunk);
				return true;
			} catch (fallbackEditErr) {
				logger.warn(
					"[Message] Plain text edit also failed, falling back to reply:",
					fallbackEditErr,
				);
			}
		}
	}
	return false;
}

async function sendChunkWithFallback(
	ctx: Context,
	chunk: string,
	options: SendOptions,
	parseMode?: ParseMode,
	isFirst = false,
): Promise<void> {
	const replyTo = isFirst ? options.reply_to_message_id : undefined;
	try {
		await ctx.reply(chunk, {
			...options,
			parse_mode: parseMode,
			reply_to_message_id: replyTo,
		});
	} catch (e) {
		if (parseMode) {
			logger.warn(
				`[Message] Failed to send message with parse_mode '${parseMode}'. Falling back to plain text reply:`,
				e,
			);
			await ctx.reply(chunk, {
				...options,
				parse_mode: undefined,
				reply_to_message_id: replyTo,
			});
		} else {
			throw e;
		}
	}
}

/**
 * Sends a (potentially long) message to Telegram.
 * Defaults to Markdown parse_mode to properly render code blocks and formatting.
 * If Telegram fails to parse markdown entities, automatically falls back to plain text.
 * If edit_message_id is provided, edits that message with the first chunk.
 * Subsequent chunks (if any) are sent as new messages.
 */
export async function sendLongMessage(
	ctx: Context,
	text: string,
	options: SendOptions = {},
): Promise<void> {
	if (!text?.trim()) return;

	const parseMode: ParseMode | undefined =
		options.parse_mode !== undefined ? options.parse_mode : "Markdown";

	const rawChunks = splitMessage(text);
	if (rawChunks.length === 0) return;

	const chunks =
		parseMode === "Markdown" || parseMode === "MarkdownV2"
			? balanceCodeFences(rawChunks)
			: rawChunks;

	for (let i = 0; i < chunks.length; i++) {
		const isFirst = i === 0;
		const chunk = chunks[i];

		if (isFirst && options.edit_message_id && ctx.chat) {
			const edited = await tryEditStatusMessage(
				ctx,
				ctx.chat.id,
				options.edit_message_id,
				chunk,
				parseMode,
			);
			if (edited) continue;
		}

		await sendChunkWithFallback(ctx, chunk, options, parseMode, isFirst);
	}
}

/**
 * Extracts a friendly title or user full name from a Telegram getChat response.
 */
export function extractTelegramChatTitle(tgChat: {
	title?: string;
	first_name?: string;
	last_name?: string;
	username?: string;
}): string {
	if (tgChat.title) return tgChat.title;
	if (tgChat.first_name) {
		const fullName = tgChat.last_name
			? `${tgChat.first_name} ${tgChat.last_name}`
			: tgChat.first_name;
		return tgChat.username ? `${fullName} (@${tgChat.username})` : fullName;
	}
	return "";
}
