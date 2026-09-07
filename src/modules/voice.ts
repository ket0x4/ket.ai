import type { Bot } from "grammy";
import { Repository } from "../db/repository";
import { GeminiService } from "../services/gemini/index";
import { transcribeAudio } from "../services/gemini/mediaPerception";
import {
	isDirectMediaInteraction,
	processMediaInteraction,
} from "../services/mediaHelper";
import logger from "../utils/logger";
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
			generateReply: async (
				buffer,
				mimeType,
				history,
				activeTopic,
				targetMessage,
			) => {
				logger.info(
					"[Voice] Transcribing voice message using gemini-3.5-transcribe...",
				);
				const transcription = await transcribeAudio(buffer, mimeType);
				const cleanTranscription = transcription.trim();

				if (!cleanTranscription) {
					return "Ses kaydında anlaşılır bir konuşma duyamadım, tekrar edebilir misin?";
				}

				const formattedText = `[Ses Kaydı]: ${cleanTranscription}`;
				const chatIdStr = ctx.chat?.id.toString();
				const msgId = ctx.message?.message_id;

				if (chatIdStr && msgId) {
					Repository.updateMessageText(chatIdStr, msgId, formattedText);
				}

				const updatedTargetMessage = targetMessage
					? { ...targetMessage, text: formattedText }
					: undefined;

				return GeminiService.generateReply(
					history,
					activeTopic,
					false,
					undefined,
					chatIdStr,
					undefined,
					undefined,
					undefined,
					undefined,
					updatedTargetMessage,
				);
			},
			fallbackErrorMessage:
				"Failed to process your voice message. Please try again later.",
		});
	});
}
