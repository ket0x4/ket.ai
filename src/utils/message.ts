import { Context } from "grammy";

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

export interface SendOptions {
  reply_to_message_id?: number;
  parse_mode?: string;
}

/**
 * Sends a (potentially long) message to Telegram, splitting it into multiple
 * messages if it exceeds the 4096-character limit.
 *
 * Only the first chunk is sent as a reply to the original message.
 * Subsequent chunks are sent as plain messages to keep the thread readable.
 */
export async function sendLongMessage(
  ctx: Context,
  text: string,
  options: SendOptions = {}
): Promise<void> {
  const chunks = splitMessage(text);

  for (let i = 0; i < chunks.length; i++) {
    const isFirst = i === 0;
    await ctx.reply(chunks[i], {
      ...options,
      // Only attach reply_to on the first chunk
      reply_to_message_id: isFirst ? options.reply_to_message_id : undefined,
    });
  }
}
