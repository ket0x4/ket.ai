import type { ArtifactMediaType } from "./types";

const MAX_OUTPUT_CHARS = 4000;
const MAX_OUTPUT_LINES = 120;
const HEAD_LINES = 45;
const TAIL_LINES = 20;

const TEXT_FIELDS = ["stdout", "stderr", "content", "text"] as const;

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
			text: `${head}\n\n[... Truncated ${lines.length - HEAD_LINES - TAIL_LINES} lines (${text.length} chars) ...]\n\n${tail}`,
			truncated: true,
		};
	}

	if (text.length > MAX_OUTPUT_CHARS) {
		const headChars = Math.floor(MAX_OUTPUT_CHARS * 0.7);
		const tailChars = Math.floor(MAX_OUTPUT_CHARS * 0.2);
		return {
			text: `${text.slice(0, headChars)}\n\n[... Truncated ${text.length - headChars - tailChars} chars ...]\n\n${text.slice(-tailChars)}`,
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

function stripArtifactBuffers(items: unknown[]): unknown[] {
	return items.map((item) => {
		if (item && typeof item === "object") {
			const { data, ...rest } = item as Record<string, unknown>;
			return {
				...rest,
				has_data: Boolean(data),
				data_size_bytes: typeof data === "string" ? data.length : undefined,
			};
		}
		return item;
	});
}

function stripEmptyFields(
	obj: Record<string, unknown>,
): Record<string, unknown> {
	const cleaned: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v === undefined || v === null || v === "") continue;
		if (Array.isArray(v) && v.length === 0) continue;
		cleaned[k] = v;
	}
	return cleaned;
}

/**
 * Sanitizes tool results before passing to LLM context:
 * 1. Strips heavy base64 buffers from artifacts/images.
 * 2. Truncates oversized text/stdout fields with head-tail preservation.
 * 3. Drops empty/null fields to minimize token usage.
 */
export function sanitizeToolResultForLLM(result: unknown): unknown {
	if (typeof result === "string") {
		return smartTruncateText(result).text;
	}

	if (!result || typeof result !== "object") {
		return result;
	}

	const obj = { ...(result as Record<string, unknown>) };

	if (Array.isArray(obj.artifacts)) {
		obj.artifacts = stripArtifactBuffers(obj.artifacts);
	}
	if (Array.isArray(obj.images)) {
		obj.images = stripArtifactBuffers(obj.images);
	}

	for (const field of TEXT_FIELDS) {
		const val = obj[field];
		if (typeof val === "string") {
			const { text, truncated } = smartTruncateText(val);
			obj[field] = text;
			if (truncated && field !== "stderr") {
				obj.truncated = true;
			}
		}
	}

	return stripEmptyFields(obj);
}
