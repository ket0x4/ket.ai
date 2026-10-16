import { createHash } from "node:crypto";
import { type Context, InputFile, InputMediaBuilder } from "grammy";
import type { GeneratedMediaArtifact } from "../../agent/types";
import logger from "../../utils/logger";
import { markdownToTelegramHtml, sendLongMessage } from "../../utils/message";
import type { ToolNotifier } from "./toolNotifier";

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

function computeBufferHash(buf: Buffer): string {
	return createHash("sha256").update(buf).digest("hex");
}

/**
 * Deduplicates artifacts by filename and content hash, preserving
 * the latest version and any explicitly provided caption.
 */
function deduplicateArtifacts(
	artifacts: GeneratedMediaArtifact[],
): GeneratedMediaArtifact[] {
	const seen = new Map<string, GeneratedMediaArtifact>();
	const seenHashes = new Set<string>();

	for (const art of artifacts) {
		const key = art.filename.toLowerCase();
		const hash = computeBufferHash(art.buffer);

		const existing = seen.get(key);
		if (existing) {
			seen.set(key, {
				...art,
				caption: art.caption || existing.caption,
			});
		} else if (!seenHashes.has(hash)) {
			seen.set(key, { ...art, caption: art.caption || undefined });
			seenHashes.add(hash);
		}
	}
	return Array.from(seen.values());
}

interface CaptionSplitResult {
	captionHtml?: string;
	captionPlain: string;
	overflowMarkdown?: string;
}

function findMarkdownSplitPoint(text: string, maxChars: number): number {
	const paraBreak = text.lastIndexOf("\n\n", maxChars);
	if (paraBreak > maxChars * 0.4) return paraBreak;

	const lineBreak = text.lastIndexOf("\n", maxChars);
	if (lineBreak > maxChars * 0.4) return lineBreak;

	const sentenceBreak = text.lastIndexOf(". ", maxChars);
	if (sentenceBreak > maxChars * 0.4) return sentenceBreak + 1;

	const spaceBreak = text.lastIndexOf(" ", maxChars);
	if (spaceBreak > maxChars * 0.4) return spaceBreak;

	return maxChars;
}

function tryConvertHtmlUnderLimit(
	text: string,
	limit = 1024,
): string | undefined {
	try {
		const converted = markdownToTelegramHtml(text);
		if (converted.length <= limit) return converted;
	} catch {}
	return undefined;
}

/**
 * Splits reply text so it fits within Telegram's strict 1024-character
 * media caption limit, converting to Telegram HTML entities.
 */
function splitCaptionAndOverflow(
	markdown: string,
	maxChars = 900,
): CaptionSplitResult {
	const trimmed = markdown.trim();
	if (!trimmed) {
		return { captionPlain: "" };
	}

	const wholeHtml = tryConvertHtmlUnderLimit(trimmed, 1024);
	if (wholeHtml) {
		return { captionHtml: wholeHtml, captionPlain: trimmed };
	}

	const splitIdx = findMarkdownSplitPoint(trimmed, maxChars);
	let head = trimmed.slice(0, splitIdx).trim();
	const overflow = trimmed.slice(splitIdx).trim();

	let html = tryConvertHtmlUnderLimit(head, 1024);
	if (!html) {
		head = head.slice(0, 750);
		html = tryConvertHtmlUnderLimit(head, 1024);
	}

	return {
		captionHtml: html,
		captionPlain: head,
		overflowMarkdown: overflow || undefined,
	};
}

async function sendSingleArtifact(
	ctx: Context,
	art: GeneratedMediaArtifact,
	captionInfo?: { html?: string; plain: string },
	replyToMessageId?: number,
): Promise<void> {
	const sizeText = formatFileSize(art.sizeBytes || art.buffer.length);
	const emoji = getArtifactEmoji(art.type, art.filename);
	const fallbackCaption = `${emoji} ${art.filename} (${sizeText})`;

	const caption =
		captionInfo?.html || captionInfo?.plain || art.caption || fallbackCaption;
	const parseMode = captionInfo?.html ? ("HTML" as const) : undefined;
	const inputFile = new InputFile(art.buffer, art.filename);
	const replyParams = replyToMessageId
		? { reply_to_message_id: replyToMessageId }
		: undefined;

	const sendWith = async (mode?: "HTML") => {
		const textToSend =
			mode === "HTML" && captionInfo?.html
				? captionInfo.html
				: captionInfo?.plain || caption;
		const opts = {
			caption: textToSend,
			parse_mode: mode,
			...replyParams,
		};
		if (art.type === "image") {
			await ctx.replyWithPhoto(inputFile, opts);
		} else if (art.type === "video") {
			await ctx.replyWithVideo(inputFile, opts);
		} else if (art.type === "audio") {
			await ctx.replyWithAudio(inputFile, opts);
		} else {
			await ctx.replyWithDocument(inputFile, opts);
		}
	};

	try {
		await sendWith(parseMode);
	} catch (err) {
		logger.warn(
			`[ArtifactSender] Failed to send artifact (${art.filename}) with parse_mode ${parseMode}:`,
			err,
		);
		try {
			await sendWith(undefined);
		} catch (plainErr) {
			logger.warn(
				`[ArtifactSender] Failed to send artifact (${art.filename}) as ${art.type}, trying document fallback:`,
				plainErr,
			);
			try {
				await ctx.replyWithDocument(inputFile, {
					caption: fallbackCaption,
					...replyParams,
				});
			} catch (fallbackErr) {
				logger.error(
					`[ArtifactSender] Fallback document delivery failed for ${art.filename}:`,
					fallbackErr,
				);
			}
		}
	}
}

async function deliverSingleArtifactWithReply(
	ctx: Context,
	art: GeneratedMediaArtifact,
	replyText: string,
	replyToMessageId?: number,
): Promise<void> {
	const primaryText = art.caption
		? replyText.trim()
			? replyText.includes(art.caption)
				? replyText
				: `${art.caption}\n\n${replyText}`
			: art.caption
		: replyText;

	const split = splitCaptionAndOverflow(primaryText);
	await sendSingleArtifact(
		ctx,
		art,
		split.captionPlain
			? { html: split.captionHtml, plain: split.captionPlain }
			: undefined,
		replyToMessageId,
	);

	if (split.overflowMarkdown) {
		const replyParams = replyToMessageId
			? { reply_to_message_id: replyToMessageId }
			: undefined;
		await sendLongMessage(ctx, split.overflowMarkdown, replyParams);
	}
}

async function tryDeliverVisualMediaGroup(
	ctx: Context,
	artifacts: GeneratedMediaArtifact[],
	split: CaptionSplitResult,
	replyToMessageId?: number,
): Promise<boolean> {
	const allVisual =
		artifacts.every((a) => a.type === "image" || a.type === "video") &&
		artifacts.length <= 10;
	if (!allVisual) return false;

	const replyParams = replyToMessageId
		? { reply_to_message_id: replyToMessageId }
		: undefined;

	try {
		const group = artifacts.map((art, idx) => {
			const file = new InputFile(art.buffer, art.filename);
			const caption =
				idx === 0
					? split.captionHtml || split.captionPlain || undefined
					: art.caption || undefined;
			const parse_mode =
				idx === 0 && split.captionHtml ? ("HTML" as const) : undefined;
			const opts = caption ? { caption, parse_mode } : undefined;
			if (art.type === "video") {
				return InputMediaBuilder.video(file, opts);
			}
			return InputMediaBuilder.photo(file, opts);
		});

		await ctx.replyWithMediaGroup(group, replyParams);

		if (split.overflowMarkdown) {
			await sendLongMessage(ctx, split.overflowMarkdown, replyParams);
		}
		return true;
	} catch (err) {
		logger.warn(
			"[ArtifactSender] Failed to send media group album, falling back to sequential delivery:",
			err,
		);
		return false;
	}
}

async function deliverSequentialArtifacts(
	ctx: Context,
	artifacts: GeneratedMediaArtifact[],
	split: CaptionSplitResult,
	replyToMessageId?: number,
): Promise<void> {
	for (let i = 0; i < artifacts.length; i++) {
		const art = artifacts[i];
		const isFirst = i === 0;
		const captionInfo =
			isFirst && split.captionPlain
				? { html: split.captionHtml, plain: split.captionPlain }
				: art.caption
					? { plain: art.caption }
					: undefined;

		await sendSingleArtifact(ctx, art, captionInfo, replyToMessageId);
	}

	if (split.overflowMarkdown) {
		const replyParams = replyToMessageId
			? { reply_to_message_id: replyToMessageId }
			: undefined;
		await sendLongMessage(ctx, split.overflowMarkdown, replyParams);
	}
}

/**
 * Delivers generated artifacts combined with the conversational reply text.
 */
async function deliverArtifactsWithReply(
	ctx: Context,
	rawArtifacts: GeneratedMediaArtifact[],
	replyText: string,
	replyToMessageId?: number,
): Promise<void> {
	const artifacts = deduplicateArtifacts(rawArtifacts);
	if (artifacts.length === 0) return;

	if (artifacts.length === 1) {
		await deliverSingleArtifactWithReply(
			ctx,
			artifacts[0],
			replyText,
			replyToMessageId,
		);
		return;
	}

	const split = splitCaptionAndOverflow(replyText);
	const grouped = await tryDeliverVisualMediaGroup(
		ctx,
		artifacts,
		split,
		replyToMessageId,
	);
	if (!grouped) {
		await deliverSequentialArtifacts(ctx, artifacts, split, replyToMessageId);
	}
}

/**
 * High-level response delivery orchestrator:
 * - If artifacts exist: deletes status message and delivers media with reply as caption.
 * - If no artifacts: edits status message in place with text reply, eliminating UI flicker.
 */
export async function deliverResponseWithArtifacts(
	ctx: Context,
	reply: string,
	artifacts: GeneratedMediaArtifact[],
	notifier: ToolNotifier,
	replyToMessageId?: number,
): Promise<void> {
	if (artifacts.length > 0) {
		await notifier.cleanup();
		await deliverArtifactsWithReply(ctx, artifacts, reply, replyToMessageId);
		return;
	}

	const statusMsgId = notifier.getStatusMessageId();
	await sendLongMessage(ctx, reply, {
		reply_to_message_id: replyToMessageId,
		edit_message_id: statusMsgId,
	});

	if (statusMsgId) {
		notifier.markCleanedWithoutDeletion();
	} else {
		await notifier.cleanup();
	}
}
