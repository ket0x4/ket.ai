import { describe, expect, test } from "bun:test";
import { Repository } from "../src/db/repository";
import { ai } from "../src/services/gemini/client";
import {
	describeImage,
	transcribeAudio,
} from "../src/services/gemini/mediaPerception";
import { getAudioMimeType } from "../src/utils/mediaDownloader";

describe("Media Perception and Multimodal Helpers", () => {
	test("getAudioMimeType resolves proper MIME types based on file extension", () => {
		expect(getAudioMimeType("voice.oga")).toBe("audio/ogg");
		expect(getAudioMimeType("voice.ogg")).toBe("audio/ogg");
		expect(getAudioMimeType("song.mp3")).toBe("audio/mpeg");
		expect(getAudioMimeType("recording.wav")).toBe("audio/wav");
		expect(getAudioMimeType("audio.m4a")).toBe("audio/mp4");
		expect(getAudioMimeType(undefined, "audio/opus")).toBe("audio/opus");
		expect(getAudioMimeType(undefined)).toBe("audio/ogg");
	});

	test("transcribeAudio sends audio buffer to Gemini and returns transcription", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		let capturedParams: any = null;

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		(ai.models as any).generateContent = async (params: any) => {
			capturedParams = params;
			return {
				text: "Merhaba arkadaşlar yarın saat 8'de toplanıyoruz.",
			};
		};

		try {
			const dummyBuffer = Buffer.from("fake_voice_audio_bytes");
			const result = await transcribeAudio(dummyBuffer, "audio/ogg");

			expect(result).toBe("Merhaba arkadaşlar yarın saat 8'de toplanıyoruz.");
			expect(capturedParams).not.toBeNull();
			const parts = capturedParams.contents[0].parts;
			expect(parts[1].text).toContain("transcribe all spoken words");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("transcribeAudio handles Gemini API errors gracefully", async () => {
		const originalGenerateContent = ai.models.generateContent;

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		(ai.models as any).generateContent = async () => {
			throw new Error("Network timeout / API unavailable");
		};

		try {
			const dummyBuffer = Buffer.from("corrupted_audio");
			const result = await transcribeAudio(dummyBuffer, "audio/ogg");
			expect(result).toBe("");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("describeImage sends image buffer with optional caption to Gemini", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		let capturedParams: any = null;

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		(ai.models as any).generateContent = async (params: any) => {
			capturedParams = params;
			return {
				text: "Fotoğrafta 34 ABC 123 plakalı mavi bir motosiklet açık alanda park halinde görülüyor.",
			};
		};

		try {
			const dummyBuffer = Buffer.from("fake_image_bytes");
			const userCaption = "yeni motorum nasıl";
			const result = await describeImage(
				dummyBuffer,
				"image/jpeg",
				userCaption,
			);

			expect(result).toContain("mavi bir motosiklet");
			expect(capturedParams).not.toBeNull();
			const parts = capturedParams.contents[0].parts;
			expect(parts[0].inlineData.mimeType).toBe("image/jpeg");
			expect(parts[0].inlineData.data).toBe(dummyBuffer.toString("base64"));
			expect(parts[1].text).toContain(userCaption);
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("describeImage handles errors gracefully and returns empty string", async () => {
		const originalGenerateContent = ai.models.generateContent;

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		(ai.models as any).generateContent = async () => {
			throw new Error("Gemini quota exceeded");
		};

		try {
			const dummyBuffer = Buffer.from("invalid_image");
			const result = await describeImage(dummyBuffer, "image/jpeg");
			expect(result).toBe("");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("Repository.updateMessageText updates message in database correctly", () => {
		const chatId = "test_multimodal_chat_1";
		Repository.createChat(chatId, "Multimodal Test", true);

		Repository.saveMessage({
			chatId,
			messageId: 5001,
			userId: 999,
			username: "multimodal_user",
			firstName: "Ali",
			text: "[Ses Kaydı]",
			sentAt: 1700000000,
		});

		let msg = Repository.getMessage(chatId, 5001);
		expect(msg?.text).toBe("[Ses Kaydı]");

		const updated = Repository.updateMessageText(
			chatId,
			5001,
			"[Ses Kaydı]: Yarın sinemaya gidelim mi?",
		);
		expect(updated).toBeTrue();

		msg = Repository.getMessage(chatId, 5001);
		expect(msg?.text).toBe("[Ses Kaydı]: Yarın sinemaya gidelim mi?");
	});
});
