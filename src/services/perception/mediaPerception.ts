import { toFile } from "openai";
import { CONFIG } from "../../config/index";
import logger from "../../utils/logger";
import { getOpenAiClient } from "../llm/client";
import { rateLimiters, runApiCall } from "../llm/middleware";
import { openAiProvider } from "../llm/openAiProvider";

/** Resolves a likely file extension from an audio MIME type for the upload. */
function resolveAudioFilename(mimeType: string): string {
	const lower = (mimeType || "audio/ogg").toLowerCase();
	const subtype = lower.split("/")[1]?.split(";")[0] || "ogg";
	const ext = subtype === "mpeg" ? "mp3" : subtype.replace(/^x-/, "");
	return `audio.${ext || "ogg"}`;
}

/**
 * Transcribes an audio buffer (voice note or audio file) using the
 * OpenAI-compatible audio transcriptions endpoint.
 */
export async function transcribeAudio(
	audioBuffer: Buffer,
	mimeType: string = "audio/ogg",
): Promise<string> {
	try {
		const audioFile = await toFile(
			audioBuffer,
			resolveAudioFilename(mimeType),
			{
				type: mimeType,
			},
		);
		const response = await runApiCall(
			() =>
				getOpenAiClient().audio.transcriptions.create({
					file: audioFile,
					model: CONFIG.OPENAI_TRANSCRIBE_MODEL,
				}),
			{
				limiter: rateLimiters.transcribe,
				baseDelayMs: 2000,
				logLabel: "OpenAI:transcribe",
			},
		);

		return response.text?.trim() || "";
	} catch (error) {
		logger.error("[MediaPerception] Error during audio transcription:", error);
		return "";
	}
}

/**
 * Generates a concise, factual 1-2 sentence description for an image.
 * Uses the configured OpenAI-compatible model (vision-capable).
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

		const res = await openAiProvider.chat(
			[
				{
					role: "user",
					content: prompt,
					media: { buffer: imageBuffer, mimeType },
				},
			],
			{ maxTokens: 1024 },
		);
		return res.text;
	} catch (error) {
		logger.error("[MediaPerception] Error during image description:", error);
		return "";
	}
}
