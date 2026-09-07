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
 * Escapes special HTML characters (&, <, >) for safe Telegram HTML parsing.
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/**
 * Converts standard Markdown (fenced code blocks, inline code, bold, italic, strikethrough, links)
 * to Telegram-compatible HTML entities with full syntax highlighting and robust error resilience.
 */
export function markdownToTelegramHtml(markdown: string): string {
	if (!markdown?.trim()) return "";

	// Step 1: Extract and replace code blocks with unique placeholders
	const codeBlocks: string[] = [];
	let text = markdown.replace(
		/```([a-zA-Z0-9_#+-]*)\n?([\s\S]*?)```/g,
		(_match, lang, code) => {
			const escapedCode = escapeHtml(code.replace(/^\n+|\n+$/g, ""));
			const language = lang?.trim()?.toLowerCase();
			const placeholder = `@@@CODEBLOCK${codeBlocks.length}@@@`;
			if (language) {
				codeBlocks.push(
					`<pre><code class="language-${language}">${escapedCode}</code></pre>`,
				);
			} else {
				codeBlocks.push(`<pre>${escapedCode}</pre>`);
			}
			return placeholder;
		},
	);

	// Step 2: Extract and replace inline code with unique placeholders
	const inlineCodes: string[] = [];
	text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
		const escapedCode = escapeHtml(code);
		const placeholder = `@@@INLINECODE${inlineCodes.length}@@@`;
		inlineCodes.push(`<code>${escapedCode}</code>`);
		return placeholder;
	});

	// Step 3: Escape HTML entities in the remaining normal text
	text = escapeHtml(text);

	// Step 4: Convert Markdown formatting in normal text
	// 4a. Bold: **text** or __text__
	text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
	text = text.replace(/__(.*?)__/g, "<b>$1</b>");

	// 4b. Bold: *text* (word boundary or preceded/followed by space/punctuation)
	text = text.replace(/(^|[\s(])\*([^*\n]+)\*([\s).,!?:]|$)/g, "$1<b>$2</b>$3");

	// 4c. Italic: _text_ (word boundary or preceded/followed by space/punctuation)
	text = text.replace(/(^|[\s(])_([^_\n]+)_([\s).,!?:]|$)/g, "$1<i>$2</i>$3");

	// 4d. Strikethrough: ~~text~~
	text = text.replace(/~~(.*?)~~/g, "<s>$1</s>");

	// 4e. Links: [label](url)
	text = text.replace(
		/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a href="$2">$1</a>',
	);

	// Step 5: Restore inline codes
	for (let i = 0; i < inlineCodes.length; i++) {
		text = text.replace(`@@@INLINECODE${i}@@@`, inlineCodes[i]);
	}

	// Step 6: Restore code blocks
	for (let i = 0; i < codeBlocks.length; i++) {
		text = text.replace(`@@@CODEBLOCK${i}@@@`, codeBlocks[i]);
	}

	return text;
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
 * Ensures <pre> tags spanning across split message chunks are properly closed and reopened.
 */
export function balanceHtmlTags(chunks: string[]): string[] {
	const result: string[] = [];
	let openPreTag: string | null = null;

	for (let i = 0; i < chunks.length; i++) {
		let chunk = chunks[i];

		if (openPreTag !== null) {
			chunk = `${openPreTag}${chunk}`;
		}

		const preOpenMatches = Array.from(
			chunk.matchAll(/<pre(?:><code(?:\s+class="([^"]*)")?>)?/g),
		);
		const preCloseCount = (chunk.match(/<\/pre>/g) || []).length;

		if (preOpenMatches.length > preCloseCount) {
			const lastMatch = preOpenMatches[preOpenMatches.length - 1];
			const fullTag = lastMatch[0];
			openPreTag = fullTag;
			const isCodeNested = fullTag.includes("<code");
			chunk = isCodeNested ? `${chunk}</code></pre>` : `${chunk}</pre>`;
		} else {
			openPreTag = null;
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
	rawChunk?: string,
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
			await ctx.reply(rawChunk || chunk, {
				...options,
				parse_mode: undefined,
				reply_to_message_id: replyTo,
			});
		} else {
			throw e;
		}
	}
}

function prepareMessageChunks(
	text: string,
	isHtmlMode: boolean,
	parseMode?: ParseMode,
): { chunks: string[]; rawChunks: string[] } {
	const rawChunks = splitMessage(text);
	if (rawChunks.length === 0) {
		return { chunks: [], rawChunks: [] };
	}

	if (isHtmlMode) {
		const htmlText = markdownToTelegramHtml(text);
		const rawHtmlChunks = splitMessage(htmlText);
		return {
			chunks: balanceHtmlTags(rawHtmlChunks),
			rawChunks,
		};
	}

	if (parseMode === "Markdown" || parseMode === "MarkdownV2") {
		return {
			chunks: balanceCodeFences(rawChunks),
			rawChunks,
		};
	}

	return { chunks: rawChunks, rawChunks };
}

/**
 * Sends a (potentially long) message to Telegram with full Markdown and code formatting support.
 * Converts standard Markdown to robust Telegram HTML by default (with code block syntax highlighting).
 * If Telegram fails to parse formatting entities, automatically falls back to plain text delivery.
 * If edit_message_id is provided, edits that message with the first chunk.
 * Subsequent chunks (if any) are sent as new messages.
 */
export async function sendLongMessage(
	ctx: Context,
	text: string,
	options: SendOptions = {},
): Promise<void> {
	if (!text?.trim()) return;

	const isHtmlMode =
		options.parse_mode === "HTML" || options.parse_mode === undefined;
	const parseMode: ParseMode | undefined = isHtmlMode
		? "HTML"
		: options.parse_mode;

	const { chunks, rawChunks } = prepareMessageChunks(
		text,
		isHtmlMode,
		parseMode,
	);
	if (chunks.length === 0) return;

	for (let i = 0; i < chunks.length; i++) {
		const isFirst = i === 0;
		const chunk = chunks[i];
		const rawChunk = rawChunks[i] || chunk;

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

		await sendChunkWithFallback(
			ctx,
			chunk,
			options,
			parseMode,
			isFirst,
			rawChunk,
		);
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
