import type { Bot } from "grammy";
import { CONFIG } from "../config/index";
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
			fallbackErrorMessage: CONFIG.MESSAGES.image_processing_failed,
		});
	});
}
