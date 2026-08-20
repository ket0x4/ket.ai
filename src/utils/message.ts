import type { Context } from "grammy";
import type { ParseMode } from "grammy/types";
import logger from "./logger";

const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Splits text into chunks that respect Telegram's 4096-character message limit.
 * Tries to split on paragraph or sentence boundaries to avoid cutting mid-sentence.
 */
function splitMessage(text: string): string[] {
	if (text.length <= TELEGRAM_MAX_LENGTH) return [text];

	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > TELEGRAM_MAX_LENGTH) {
		let splitAt = TELEGRAM_MAX_LENGTH;

		// Prefer splitting at a paragraph break
		const paraBreak = remaining.lastIndexOf("\n\n", TELEGRAM_MAX_LENGTH);
		if (paraBreak > TELEGRAM_MAX_LENGTH * 0.5) {
			splitAt = paraBreak + 2; // include the newlines in the preceding chunk
		} else {
			// Fall back to a newline
			const lineBreak = remaining.lastIndexOf("\n", TELEGRAM_MAX_LENGTH);
			if (lineBreak > TELEGRAM_MAX_LENGTH * 0.5) {
				splitAt = lineBreak + 1;
			} else {
				// Last resort: split at a space
				const spaceBreak = remaining.lastIndexOf(" ", TELEGRAM_MAX_LENGTH);
				if (spaceBreak > TELEGRAM_MAX_LENGTH * 0.5) {
					splitAt = spaceBreak + 1;
				}
				// If nothing found in the latter half, hard-cut at the limit
			}
		}

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
	const chunks = splitMessage(text);

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
