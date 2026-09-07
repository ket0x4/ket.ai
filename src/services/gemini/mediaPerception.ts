import { CONFIG } from "../../config/index";
import logger from "../../utils/logger";
import { ai } from "./client";
import { getThinkingConfig, runWithRetry } from "./utils";

/**
 * Transcribes an audio buffer (voice note or audio file) using the dedicated
 * SOTA Gemini 3.5 Transcribe speech-to-text model.
 */
export async function transcribeAudio(
	audioBuffer: Buffer,
	mimeType: string = "audio/ogg",
): Promise<string> {
	try {
		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: "gemini-3.5-transcribe",
				contents: [
					{
						role: "user",
						parts: [
							{
								inlineData: {
									data: audioBuffer.toString("base64"),
									mimeType,
								},
							},
							{
								text: "Accurately transcribe all spoken words verbatim in the original spoken language. Return ONLY the transcribed text.",
							},
						],
					},
				],
				config: {
					maxOutputTokens: 2048,
				},
			}),
		);

		const text = response.text?.trim() || "";
		return text;
	} catch (error) {
		logger.error("[MediaPerception] Error during audio transcription:", error);
		return "";
	}
}

/**
 * Generates a concise, factual 1-2 sentence description for an image.
 * Uses the model configured in CONFIG.GEMINI_MODEL.
 */
export async function describeImage(
	imageBuffer: Buffer,
	mimeType: string = "image/jpeg",
	userCaption?: string,
): Promise<string> {
	try {
		const prompt = `Summarize what is shown in this image in 1-2 concise, factual sentences for group chat history.
Describe what/who is shown (objects, scene, activities, persons) and any notable visible text, signs, labels, numbers, or titles.
If it is a meme, tweet, screenshot, or document, state its main topic or message.
Do not comment, interpret, or make assumptions; provide only factual content. Return ONLY the concise description.${userCaption ? `\nUser caption provided with image: "${userCaption}".` : ""}`;

		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				contents: [
					{
						role: "user",
						parts: [
							{
								inlineData: {
									data: imageBuffer.toString("base64"),
									mimeType,
								},
							},
							{
								text: prompt,
							},
						],
					},
				],
				config: {
					maxOutputTokens: 1024,
					thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
				},
			}),
		);

		const text = response.text?.trim() || "";
		return text;
	} catch (error) {
		logger.error("[MediaPerception] Error during image description:", error);
		return "";
	}
}
