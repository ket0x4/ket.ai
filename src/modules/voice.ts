import type { Bot } from "grammy";
import {
	isDirectMediaInteraction,
	processMediaInteraction,
} from "../services/mediaHelper";
import { getAudioMimeType } from "../utils/mediaDownloader";

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
			fallbackErrorMessage:
				"Failed to process your voice message. Please try again later.",
		});
	});
}
