import { type Context, InputFile } from "grammy";
import type { GeneratedMediaArtifact } from "../../agent/types";
import logger from "../../utils/logger";

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getArtifactEmoji(type: string, filename: string): string {
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

export async function sendSingleArtifact(
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
			`[ArtifactSender] Failed to send generated artifact (${art.filename}) as ${art.type}:`,
			err,
		);
		try {
			await ctx.replyWithDocument(inputFile, { caption, ...replyParams });
		} catch (fallbackErr) {
			logger.error(
				`[ArtifactSender] Fallback document delivery also failed for ${art.filename}:`,
				fallbackErr,
			);
		}
	}
}

export async function sendGeneratedArtifacts(
	ctx: Context,
	artifacts: GeneratedMediaArtifact[],
	replyToMessageId?: number,
): Promise<void> {
	for (const art of artifacts) {
		await sendSingleArtifact(ctx, art, replyToMessageId);
	}
}
