import type { Context } from "grammy";
import { CONFIG } from "../config/index";
import logger from "./logger";

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

export interface DownloadedMedia {
	buffer: Buffer;
	filePath: string;
	fileSize: number | undefined;
}

export interface DownloadError {
	error: string;
}

export type DownloadResult = DownloadedMedia | DownloadError;

/**
 * Downloads a media file (photo, voice, etc.) from Telegram servers.
 * Returns the file buffer and metadata, or an error object.
 */
export async function downloadTelegramFile(
	ctx: Context,
	mediaType: string = "file",
): Promise<DownloadResult> {
	const fileDetails = await ctx.getFile();

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

	logger.info(
		`[MediaDownloader] Downloaded ${mediaType} (${buffer.length} bytes) from ${fileDetails.file_path}`,
	);

	return {
		buffer,
		filePath: fileDetails.file_path,
		fileSize: fileDetails.file_size,
	};
}

/**
 * Type guard to check if a download result is an error.
 */
export function isDownloadError(
	result: DownloadResult,
): result is DownloadError {
	return "error" in result;
}
