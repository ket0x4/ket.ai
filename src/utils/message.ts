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
 * Splits text into chunks that respect Telegram's 4096-character message limit.
 * Tries to split on paragraph or sentence boundaries to avoid cutting mid-sentence.
 */
function splitMessage(text: string): string[] {
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

/**
 * Sends a (potentially long) message to Telegram.
 * If edit_message_id is provided, edits that message with the first chunk.
 * Subsequent chunks (if any) are sent as new messages.
 */
export async function sendLongMessage(
	ctx: Context,
	text: string,
	options: SendOptions = {},
): Promise<void> {
	if (!text?.trim()) return;

	const chunks = splitMessage(text);
	if (chunks.length === 0) return;

	for (let i = 0; i < chunks.length; i++) {
		const isFirst = i === 0;

		if (isFirst && options.edit_message_id && ctx.chat) {
			try {
				await ctx.api.editMessageText(
					ctx.chat.id,
					options.edit_message_id,
					chunks[i],
					{ parse_mode: options.parse_mode },
				);
				continue;
			} catch (e) {
				logger.warn(
					"[Message] Failed to edit status message, falling back to reply:",
					e,
				);
			}
		}

		await ctx.reply(chunks[i], {
			...options,
			// Only attach reply_to on the first chunk
			reply_to_message_id: isFirst ? options.reply_to_message_id : undefined,
		});
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
