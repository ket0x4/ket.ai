import type { Context } from "grammy";
import { CONFIG } from "../config/index";
import logger from "./logger";

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

interface DownloadedMedia {
	buffer: Buffer;
	filePath: string;
	fileSize: number | undefined;
}

interface DownloadError {
	error: string;
}

type DownloadResult = DownloadedMedia | DownloadError;

/**
 * Extracts the highest resolution photo file ID from a Telegram photo array.
 */
export function extractPhotoFileId(
	photo?: Array<{ file_id: string }>,
): string | undefined {
	if (!photo || photo.length === 0) return undefined;
	return photo[photo.length - 1].file_id;
}

/**
 * Determines the audio MIME type from a Telegram file path or provided fallback MIME type.
 */
export function getAudioMimeType(
	filePath?: string,
	fallbackMime?: string,
): string {
	if (fallbackMime) return fallbackMime;
	if (!filePath) return "audio/ogg";
	if (filePath.endsWith(".mp3")) return "audio/mpeg";
	if (filePath.endsWith(".wav")) return "audio/wav";
	if (filePath.endsWith(".m4a")) return "audio/mp4";
	if (filePath.endsWith(".ogg") || filePath.endsWith(".oga"))
		return "audio/ogg";
	return "audio/ogg";
}

async function fetchAndProcessTelegramFile(
	fileDetails: { file_path?: string; file_size?: number },
	mediaType: string,
	identifier?: string,
): Promise<DownloadResult> {
	if (!fileDetails.file_path) {
		return {
			error: `Could not retrieve ${mediaType} file path from Telegram.`,
		};
	}

	if (fileDetails.file_size && fileDetails.file_size > MAX_FILE_SIZE_BYTES) {
		return { error: `${mediaType} file is too large (maximum 30MB).` };
	}

	const fileUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${fileDetails.file_path}`;
	const response = await fetch(fileUrl);

	if (!response.ok) {
		throw new Error(
			`Telegram file download failed with status ${response.status}`,
		);
	}

	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const contextStr = identifier ? ` by ${identifier}` : "";
	logger.info(
		`[MediaDownloader] Downloaded ${mediaType} (${buffer.length} bytes)${contextStr} from ${fileDetails.file_path}`,
	);

	return {
		buffer,
		filePath: fileDetails.file_path,
		fileSize: fileDetails.file_size,
	};
}

/**
 * Downloads a Telegram file by its file_id string.
 */
export async function downloadTelegramFileById(
	ctx: Context,
	fileId: string,
	mediaType: string = "file",
): Promise<DownloadResult> {
	try {
		const fileDetails = await ctx.api.getFile(fileId);
		return await fetchAndProcessTelegramFile(
			fileDetails,
			mediaType,
			`file_id ${fileId}`,
		);
	} catch (err) {
		logger.error(
			`[MediaDownloader] Error downloading ${mediaType} with file_id ${fileId}:`,
			err,
		);
		return {
			error: `Failed to download ${mediaType} from Telegram.`,
		};
	}
}

/**
 * Downloads a media file (photo, voice, etc.) from Telegram servers using ctx.getFile().
 * Returns the file buffer and metadata, or an error object.
 */
export async function downloadTelegramFile(
	ctx: Context,
	mediaType: string = "file",
): Promise<DownloadResult> {
	try {
		const fileDetails = await ctx.getFile();
		return await fetchAndProcessTelegramFile(fileDetails, mediaType);
	} catch (err) {
		logger.error(
			`[MediaDownloader] Error downloading ${mediaType} from message:`,
			err,
		);
		return {
			error: `Failed to download ${mediaType} from Telegram.`,
		};
	}
}

/**
 * Type guard to check if a download result is an error.
 */
export function isDownloadError(
	result: DownloadResult,
): result is DownloadError {
	return "error" in result;
}
