import type { Context } from "grammy";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import {
	downloadTelegramFileById,
	extractPhotoFileId,
	getAudioMimeType,
	isDownloadError,
} from "../../utils/mediaDownloader";
import { describeImage, transcribeAudio } from "../gemini/mediaPerception";
import { checkAndRunBackgroundMemoryExtraction } from "../gemini/memoryWorker";

async function processBackgroundVoice(
	ctx: Context,
	chatIdStr: string,
	messageId: number,
	fileId: string,
	mimeType?: string,
): Promise<void> {
	try {
		const downloadResult = await downloadTelegramFileById(ctx, fileId, "voice");
		if (isDownloadError(downloadResult)) {
			logger.warn(
				`[Multimodal Perception] Could not download voice message ${messageId} in chat ${chatIdStr}: ${downloadResult.error}`,
			);
			return;
		}

		const resolvedMime = getAudioMimeType(downloadResult.filePath, mimeType);
		const transcription = await transcribeAudio(
			downloadResult.buffer,
			resolvedMime,
		);

		const updatedText = transcription.trim()
			? `[Ses Kaydı]: ${transcription.trim()}`
			: `[Ses Kaydı: (Sessiz / Konuşma Yok)]`;

		Repository.updateMessageText(chatIdStr, messageId, updatedText);
		logger.info(
			`[Multimodal Perception] Voice transcribed for msg ${messageId} in chat ${chatIdStr}: "${updatedText}"`,
		);

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});
	} catch (err) {
		logger.error(
			`[Multimodal Perception] Error processing background voice for msg ${messageId}:`,
			err,
		);
	}
}

async function processBackgroundPhoto(
	ctx: Context,
	chatIdStr: string,
	messageId: number,
	fileId: string,
	caption?: string,
): Promise<void> {
	try {
		const downloadResult = await downloadTelegramFileById(ctx, fileId, "photo");
		if (isDownloadError(downloadResult)) {
			logger.warn(
				`[Multimodal Perception] Could not download photo message ${messageId} in chat ${chatIdStr}: ${downloadResult.error}`,
			);
			return;
		}

		const description = await describeImage(
			downloadResult.buffer,
			"image/jpeg",
			caption,
		);

		let updatedText = "";
		if (description.trim()) {
			updatedText = caption?.trim()
				? `[Image - "${caption.trim()}"]: ${description.trim()}`
				: `[Image]: ${description.trim()}`;
		} else if (caption?.trim()) {
			updatedText = `[Image]: ${caption.trim()}`;
		} else {
			updatedText = `[Image]`;
		}

		Repository.updateMessageText(chatIdStr, messageId, updatedText);
		logger.info(
			`[Multimodal Perception] Photo described for msg ${messageId} in chat ${chatIdStr}: "${updatedText}"`,
		);

		// Trigger background memory worker counter
		checkAndRunBackgroundMemoryExtraction(chatIdStr).catch(() => {});
	} catch (err) {
		logger.error(
			`[Multimodal Perception] Error processing background photo for msg ${messageId}:`,
			err,
		);
	}
}

interface ExtractedMediaInfo {
	textContent: string;
	photoFileId?: string;
	voiceFileId?: string;
	voiceMimeType?: string;
	documentFileId?: string;
	documentFileName?: string;
	documentMimeType?: string;
	initialText?: string;
}

function resolveInitialMediaText(
	textContent: string,
	photoFileId?: string,
	voiceFileId?: string,
	documentFileName?: string,
	documentFileId?: string,
): string | undefined {
	if (textContent) return textContent;
	if (photoFileId) return "[Image]";
	if (voiceFileId) return "[Ses Kaydı]";
	if (documentFileName) return `[Document: ${documentFileName}]`;
	if (documentFileId) return "[Document]";
	return undefined;
}

export function extractMessageMediaInfo(
	msg?: Context["message"],
): ExtractedMediaInfo {
	if (!msg) return { textContent: "" };

	const textContent = msg.text || msg.caption || "";
	const photoFileId =
		extractPhotoFileId(msg.photo) ||
		(msg.document?.mime_type?.startsWith("image/")
			? msg.document.file_id
			: undefined);
	const voiceFileId = msg.voice?.file_id || msg.audio?.file_id;
	const voiceMimeType = msg.voice?.mime_type || msg.audio?.mime_type;
	const documentFileId = msg.document?.file_id;
	const documentFileName = msg.document?.file_name;
	const documentMimeType = msg.document?.mime_type;

	const initialText = resolveInitialMediaText(
		textContent,
		photoFileId,
		voiceFileId,
		documentFileName,
		documentFileId,
	);

	return {
		textContent,
		photoFileId,
		voiceFileId,
		voiceMimeType,
		documentFileId,
		documentFileName,
		documentMimeType,
		initialText,
	};
}

export function triggerBackgroundMediaPerception(
	ctx: Context,
	chatIdStr: string,
	messageId: number,
	mediaInfo: ExtractedMediaInfo,
): void {
	if (mediaInfo.voiceFileId) {
		processBackgroundVoice(
			ctx,
			chatIdStr,
			messageId,
			mediaInfo.voiceFileId,
			mediaInfo.voiceMimeType,
		).catch((err) => {
			logger.error(
				`[Multimodal Perception] Voice background task error in chat ${chatIdStr}:`,
				err,
			);
		});
	} else if (mediaInfo.photoFileId) {
		processBackgroundPhoto(
			ctx,
			chatIdStr,
			messageId,
			mediaInfo.photoFileId,
			mediaInfo.textContent || undefined,
		).catch((err) => {
			logger.error(
				`[Multimodal Perception] Photo background task error in chat ${chatIdStr}:`,
				err,
			);
		});
	}
}
