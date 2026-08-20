import type { Bot } from "grammy";
import { CONFIG } from "../config/index";
import { botUsername } from "../services/bot";
import { GeminiService } from "../services/gemini/index";
import {
	isDirectMediaInteraction,
	processMediaInteraction,
} from "../services/mediaHelper";

export function registerImageHandlers(bot: Bot) {
	// Listen to photo messages
	bot.on("message:photo", async (ctx) => {
		const caption = ctx.message.caption || "";
		const containsNickname = /\bket\b/i.test(caption);
		const isMentioned = caption.includes(`@${botUsername}`);

		const isDirect = isDirectMediaInteraction(
			ctx,
			"Image",
			containsNickname || isMentioned,
		);

		if (!isDirect) {
			return;
		}

		await processMediaInteraction(ctx, {
			mediaType: "photo",
			resolveMimeType: () => "image/jpeg",
			generateReply: (buffer, mimeType, history, activeTopic) =>
				GeminiService.generateImageReply(
					buffer,
					mimeType,
					history,
					activeTopic,
				),
			fallbackErrorMessage: CONFIG.MESSAGES.image_processing_failed,
		});
	});
}
