import type { Bot } from "grammy";
import { CONFIG } from "../config/index";
import { GeminiService } from "../services/gemini/index";
import {
	isDirectMediaInteraction,
	processMediaInteraction,
} from "../services/mediaHelper";

export function registerImageHandlers(bot: Bot) {
	// Listen to photo messages
	bot.on("message:photo", async (ctx) => {
		if (!isDirectMediaInteraction(ctx, "Image")) {
			return;
		}

		await processMediaInteraction(ctx, {
			mediaType: "photo",
			resolveMimeType: () => "image/jpeg",
			generateReply: (buffer, mimeType, history, activeTopic, targetMessage) =>
				GeminiService.generateImageReply(
					buffer,
					mimeType,
					history,
					activeTopic,
					undefined,
					ctx.chat?.id.toString(),
					undefined,
					targetMessage,
				),
			fallbackErrorMessage: CONFIG.MESSAGES.image_processing_failed,
		});
	});
}
