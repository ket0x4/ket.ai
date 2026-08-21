import { CONFIG } from "../../config/index";
import logger from "../../utils/logger";
import { ai } from "./client";
import { getThinkingConfig, runWithRetry } from "./utils";

/**
 * Transcribes an audio buffer (voice note or audio file) using Gemini multimodal capabilities.
 * Uses the model configured in CONFIG.GEMINI_MODEL.
 */
export async function transcribeAudio(
	audioBuffer: Buffer,
	mimeType: string = "audio/ogg",
): Promise<string> {
	try {
		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
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
								text: "Listen to this audio recording and accurately transcribe all spoken words verbatim in the original spoken language (primarily Turkish or English). Do not summarize, explain, or add commentary. Return ONLY the transcribed text. If there is no speech, or only inaudible background noise/music, return an empty string.",
							},
						],
					},
				],
				config: {
					temperature: 0.1,
					maxOutputTokens: 2048,
					thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
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
					temperature: 0.2,
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
