import type { ArtifactMediaType, GeneratedMediaArtifact } from "./types";

const MAX_OUTPUT_CHARS = 6000;
const MAX_OUTPUT_LINES = 150;
const HEAD_LINES = 50;
const TAIL_LINES = 25;

/**
 * Intelligently truncates oversized text output preserving the beginning and end.
 */
export function smartTruncateText(text: string): {
	text: string;
	truncated: boolean;
} {
	if (
		!text ||
		(text.length <= MAX_OUTPUT_CHARS &&
			text.split("\n").length <= MAX_OUTPUT_LINES)
	) {
		return { text, truncated: false };
	}

	const lines = text.split("\n");
	if (lines.length > MAX_OUTPUT_LINES) {
		const head = lines.slice(0, HEAD_LINES).join("\n");
		const tail = lines.slice(-TAIL_LINES).join("\n");
		const omittedCount = lines.length - HEAD_LINES - TAIL_LINES;
		const truncated = `${head}\n\n[... Truncated ${omittedCount} lines of output (${text.length} chars total) ...]\n\n${tail}`;
		return { text: truncated, truncated: true };
	}

	if (text.length > MAX_OUTPUT_CHARS) {
		const head = text.slice(0, Math.floor(MAX_OUTPUT_CHARS * 0.7));
		const tail = text.slice(-Math.floor(MAX_OUTPUT_CHARS * 0.2));
		const omittedChars = text.length - head.length - tail.length;
		const truncated = `${head}\n\n[... Truncated ${omittedChars} characters ...]\n\n${tail}`;
		return { text: truncated, truncated: true };
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

export function extractRawArtifacts(result: unknown): unknown[] {
	if (!result || typeof result !== "object") return [];
	const obj = result as { artifacts?: unknown; images?: unknown };
	if (Array.isArray(obj.artifacts)) return obj.artifacts;
	if (Array.isArray(obj.images)) return obj.images;
	return [];
}

export function parseGeneratedArtifact(art: {
	filename?: string;
	mimeType?: string;
	data?: string;
	type?: ArtifactMediaType;
	sizeBytes?: number;
}): GeneratedMediaArtifact | null {
	if (!art.data || typeof art.data !== "string") return null;
	const buf = Buffer.from(art.data, "base64");
	return {
		filename: art.filename || "output.dat",
		mimeType: art.mimeType || "application/octet-stream",
		buffer: buf,
		type: inferArtifactType(art.mimeType, art.type),
		sizeBytes: art.sizeBytes || buf.length,
	};
}

export function extractMediaArtifactsFromResult(
	result: unknown,
): GeneratedMediaArtifact[] {
	const rawArtifacts = extractRawArtifacts(result);
	if (rawArtifacts.length === 0) return [];

	const artifacts: GeneratedMediaArtifact[] = [];
	for (const raw of rawArtifacts) {
		const parsed = parseGeneratedArtifact(
			raw as Parameters<typeof parseGeneratedArtifact>[0],
		);
		if (parsed) artifacts.push(parsed);
	}
	return artifacts;
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

	// Strip heavy base64 data from artifacts
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

	// Strip heavy base64 data from images
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

	// Smart truncate stdout if present
	if (typeof obj.stdout === "string") {
		const { text, truncated } = smartTruncateText(obj.stdout);
		obj.stdout = text;
		if (truncated) {
			obj.truncated = true;
		}
	}

	// Smart truncate stderr if present
	if (typeof obj.stderr === "string") {
		const { text } = smartTruncateText(obj.stderr);
		obj.stderr = text;
	}

	// Smart truncate content if present (workspace file reads)
	if (typeof obj.content === "string") {
		const { text, truncated } = smartTruncateText(obj.content);
		obj.content = text;
		if (truncated) {
			obj.truncated = true;
		}
	}

	return obj;
}
