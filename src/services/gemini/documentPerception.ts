import {
	type WriteWorkspaceFileResult,
	writeWorkspaceFile,
} from "../../agent/tools/workspaceTools";
import logger from "../../utils/logger";

const MAX_DIRECT_TEXT_CHARS = 40_000;

export interface PreparedDocumentContext {
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	isText: boolean;
	textContent?: string;
	isTruncated?: boolean;
	isPdf: boolean;
	isImage: boolean;
	isAudio: boolean;
	isSpreadsheet: boolean;
	mediaPayload?: { buffer: Buffer; mimeType: string };
	summaryHint?: string;
}

// ponytail: streamlined MIME and extension classification
const SPREADSHEET_REGEX = /\.(xlsx?|xlsm|parquet)$/i;
const IMAGE_REGEX = /\.(png|jpe?g|webp|gif|svg|bmp)$/i;
const AUDIO_REGEX = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;

/**
 * Strips dangerous traversal paths and invalid chars from filenames.
 */
export function sanitizeDocumentFilename(rawFilename?: string): string {
	if (!rawFilename) return "document.bin";
	const base = rawFilename.split(/[/\\]/).pop() || "document.bin";
	const cleaned = base.replace(/[^\w.-]/g, "_").trim();
	return cleaned || "document.bin";
}

/**
 * Heuristically checks whether a buffer is UTF-8 text or binary.
 */
function isLikelyTextBuffer(buffer: Buffer): boolean {
	const len = Math.min(buffer.length, 1024);
	for (let i = 0; i < len; i++) {
		if (buffer[i] === 0) {
			return false;
		}
	}
	return true;
}

export function classifyDocument(
	filename: string,
	mimeType: string,
	buffer: Buffer,
): {
	isText: boolean;
	isPdf: boolean;
	isImage: boolean;
	isAudio: boolean;
	isSpreadsheet: boolean;
} {
	const lowerMime = mimeType.toLowerCase();
	const isPdf =
		filename.toLowerCase().endsWith(".pdf") || lowerMime === "application/pdf";
	const isImage = IMAGE_REGEX.test(filename) || lowerMime.startsWith("image/");
	const isAudio = AUDIO_REGEX.test(filename) || lowerMime.startsWith("audio/");
	const isSpreadsheet =
		SPREADSHEET_REGEX.test(filename) ||
		lowerMime.includes("spreadsheet") ||
		lowerMime.includes("excel");

	const isText =
		!isPdf &&
		!isImage &&
		!isAudio &&
		!isSpreadsheet &&
		(lowerMime.startsWith("text/") ||
			lowerMime.includes("json") ||
			lowerMime.includes("javascript") ||
			lowerMime.includes("xml") ||
			isLikelyTextBuffer(buffer));

	return { isText, isPdf, isImage, isAudio, isSpreadsheet };
}

/**
 * Stages a downloaded document directly into the chat session's sandbox workspace.
 */
export async function stageDocumentInWorkspace(
	sessionId: string,
	filename: string,
	buffer: Buffer,
	isText: boolean,
): Promise<WriteWorkspaceFileResult> {
	const encoding = isText ? "utf-8" : "base64";
	const content = isText ? buffer.toString("utf-8") : buffer.toString("base64");

	logger.info(
		`[DocumentPerception] Staging '${filename}' (${buffer.length} bytes, encoding: ${encoding}) into session workspace '${sessionId}'...`,
	);

	return writeWorkspaceFile(
		{
			filename,
			content,
			sessionId,
			encoding,
		},
		{ sessionId },
	);
}

/**
 * Extracts and prepares document context for Gemini LLM.
 */
export function prepareDocumentContext(
	buffer: Buffer,
	rawFilename: string,
	mimeType: string = "application/octet-stream",
): PreparedDocumentContext {
	const fileName = sanitizeDocumentFilename(rawFilename);
	const sizeBytes = buffer.length;
	const { isText, isPdf, isImage, isAudio, isSpreadsheet } = classifyDocument(
		fileName,
		mimeType,
		buffer,
	);

	let textContent: string | undefined;
	let isTruncated = false;
	let mediaPayload: { buffer: Buffer; mimeType: string } | undefined;
	let summaryHint: string | undefined;

	if (isPdf) {
		mediaPayload = { buffer, mimeType: "application/pdf" };
		summaryHint = `PDF document (${fileName}, ${(sizeBytes / 1024).toFixed(1)} KB). Gemini can read page text and visual layouts directly.`;
	} else if (isImage) {
		mediaPayload = { buffer, mimeType: mimeType || "image/png" };
		summaryHint = `Image document (${fileName}, ${(sizeBytes / 1024).toFixed(1)} KB).`;
	} else if (isText) {
		const rawText = buffer.toString("utf-8");
		if (rawText.length > MAX_DIRECT_TEXT_CHARS) {
			const head = rawText.slice(0, 25_000);
			const tail = rawText.slice(-10_000);
			textContent = `${head}\n\n[... Truncated ${rawText.length - 35_000} chars. Full file available in workspace as '${fileName}'] ...\n\n${tail}`;
			isTruncated = true;
		} else {
			textContent = rawText;
		}
		summaryHint = `Text/Code file (${fileName}, ${sizeBytes} bytes, ${rawText.split("\n").length} lines).`;
	} else if (isSpreadsheet) {
		summaryHint = `Spreadsheet / tabular data file (${fileName}, ${(sizeBytes / 1024).toFixed(1)} KB). Available in workspace for analysis via Python (pandas, openpyxl).`;
	} else {
		summaryHint = `Binary file (${fileName}, ${(sizeBytes / 1024).toFixed(1)} KB). Saved to workspace.`;
	}

	return {
		fileName,
		mimeType,
		sizeBytes,
		isText,
		textContent,
		isTruncated,
		isPdf,
		isImage,
		isAudio,
		isSpreadsheet,
		mediaPayload,
		summaryHint,
	};
}
