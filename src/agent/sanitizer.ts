import type { ArtifactMediaType } from "./types";

const MAX_OUTPUT_CHARS = 6000;
const MAX_OUTPUT_LINES = 150;
const HEAD_LINES = 50;
const TAIL_LINES = 25;

/**
 * Intelligently truncates oversized text output preserving the beginning and end.
 */
function smartTruncateText(text: string): {
	text: string;
	truncated: boolean;
} {
	if (!text) return { text, truncated: false };

	const lines = text.split("\n");
	if (lines.length > MAX_OUTPUT_LINES) {
		const head = lines.slice(0, HEAD_LINES).join("\n");
		const tail = lines.slice(-TAIL_LINES).join("\n");
		return {
			text: `${head}\n\n[... Truncated ${lines.length - HEAD_LINES - TAIL_LINES} lines of output (${text.length} chars total) ...]\n\n${tail}`,
			truncated: true,
		};
	}

	if (text.length > MAX_OUTPUT_CHARS) {
		const headChars = Math.floor(MAX_OUTPUT_CHARS * 0.7);
		const tailChars = Math.floor(MAX_OUTPUT_CHARS * 0.2);
		return {
			text: `${text.slice(0, headChars)}\n\n[... Truncated ${text.length - headChars - tailChars} characters ...]\n\n${text.slice(-tailChars)}`,
			truncated: true,
		};
	}

	return { text, truncated: false };
}

export function inferArtifactType(
	mimeType?: string,
	explicitType?: ArtifactMediaType,
): ArtifactMediaType {
	if (explicitType) return explicitType;
	if (mimeType?.startsWith("image/")) return "image";
	if (mimeType?.startsWith("video/")) return "video";
	if (mimeType?.startsWith("audio/")) return "audio";
	return "document";
}

/**
 * Sanitizes tool results before passing to Gemini LLM context:
 * 1. Strips heavy base64 buffers from artifacts / images to prevent context poisoning.
 * 2. Truncates oversized stdout / text fields with head-tail preservation.
 */
export function sanitizeToolResultForLLM(result: unknown): unknown {
	if (typeof result === "string") {
		const { text } = smartTruncateText(result);
		return text;
	}

	if (!result || typeof result !== "object") {
		return result;
	}

	const obj = { ...(result as Record<string, unknown>) };

	if (Array.isArray(obj.artifacts)) {
		obj.artifacts = obj.artifacts.map((art) => {
			if (art && typeof art === "object") {
				const { data, ...rest } = art as Record<string, unknown>;
				return {
					...rest,
					has_data: Boolean(data),
					data_size_bytes: typeof data === "string" ? data.length : undefined,
				};
			}
			return art;
		});
	}

	if (Array.isArray(obj.images)) {
		obj.images = obj.images.map((img) => {
			if (img && typeof img === "object") {
				const { data, ...rest } = img as Record<string, unknown>;
				return {
					...rest,
					has_data: Boolean(data),
					data_size_bytes: typeof data === "string" ? data.length : undefined,
				};
			}
			return img;
		});
	}

	if (typeof obj.stdout === "string") {
		const { text, truncated } = smartTruncateText(obj.stdout);
		obj.stdout = text;
		if (truncated) {
			obj.truncated = true;
		}
	}

	if (typeof obj.stderr === "string") {
		const { text } = smartTruncateText(obj.stderr);
		obj.stderr = text;
	}

	if (typeof obj.content === "string") {
		const { text, truncated } = smartTruncateText(obj.content);
		obj.content = text;
		if (truncated) {
			obj.truncated = true;
		}
	}

	return obj;
}
