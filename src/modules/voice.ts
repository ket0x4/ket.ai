import type { Bot } from "grammy";
import { GeminiService } from "../services/gemini/index";
import {
	isDirectMediaInteraction,
	processMediaInteraction,
} from "../services/mediaHelper";

/**
 * Determines the audio MIME type from a Telegram voice file path.
 * Telegram voice messages are typically OGG/Opus (.oga),
 * but we handle other extensions as a safeguard.
 */
function getAudioMimeType(filePath: string): string {
	if (filePath.endsWith(".mp3")) return "audio/mpeg";
	if (filePath.endsWith(".wav")) return "audio/wav";
	if (filePath.endsWith(".m4a")) return "audio/mp4";
	// Default: Telegram voice messages use OGG/Opus (.oga)
	return "audio/ogg";
}

export function registerVoiceHandlers(bot: Bot) {
	// Listen to voice messages
	bot.on("message:voice", async (ctx) => {
		const isDirect = isDirectMediaInteraction(ctx, "Voice");

		if (!isDirect) {
			return;
		}

		await processMediaInteraction(ctx, {
			mediaType: "voice",
			resolveMimeType: (downloadResult) =>
				getAudioMimeType(downloadResult.filePath),
			generateReply: (buffer, mimeType, history, activeTopic) =>
				GeminiService.generateVoiceReply(
					buffer,
					mimeType,
					history,
					activeTopic,
					undefined,
					ctx.chat?.id.toString(),
				),
			fallbackErrorMessage:
				"Failed to process your voice message. Please try again later.",
		});
	});
}
