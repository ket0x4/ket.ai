import logger from "../../utils/logger";
import { stripEmoji } from "../../utils/text";

/**
 * Post-processing of model replies: extracts the actual reply text when the
 * model wrapped it in a JSON envelope, strips emoji, and suppresses stray
 * bracket payloads.
 */

function extractReplyFieldFromObject(
	parsed: Record<string, unknown>,
): string | undefined {
	const candidateFields = [
		"reply",
		"summary",
		"text",
		"message",
		"answer",
		"result",
		"output",
		"response",
		"content",
	];
	for (const field of candidateFields) {
		const val = parsed[field];
		if (typeof val === "string" && val.trim()) {
			return val.trim();
		}
	}
	return undefined;
}

function tryExtractReplyFromJsonLoose(text: string): string | null {
	const match = text.match(
		/"(?:reply|text|message|answer|response|content|output|result)"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*})/i,
	);
	if (match?.[1]) {
		try {
			return JSON.parse(`"${match[1]}"`);
		} catch {
			return match[1]
				.replace(/\\n/g, "\n")
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, "\\")
				.trim();
		}
	}
	return null;
}

function handleJsonReply(
	cleanedText: string,
	rawText: string,
	traceId: string,
): string {
	try {
		const parsed = JSON.parse(cleanedText);
		if (parsed && typeof parsed === "object") {
			const extracted = extractReplyFieldFromObject(
				parsed as Record<string, unknown>,
			);
			if (extracted) return extracted;

			if (Object.keys(parsed).length > 0) {
				return cleanedText;
			}
		}
		return "";
	} catch {
		const looseReply = tryExtractReplyFromJsonLoose(cleanedText);
		if (looseReply) return looseReply;

		logger.warn(
			`[LLM:${traceId}] Parse error on model JSON response. Using cleaned plain text. Raw text: "${rawText}"`,
		);
		return cleanedText;
	}
}

function tryExtractJsonString(text: string): string | null {
	const trimmed = text.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return trimmed;
	}
	const jsonFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (jsonFenceMatch) {
		const inner = jsonFenceMatch[1].trim();
		if (inner.startsWith("{") || inner.startsWith("[")) {
			return inner;
		}
	}
	return null;
}

export function parseAndProcessReply(
	responseText: string,
	traceId: string,
): string {
	const trimmed = responseText?.trim() || "";
	if (!trimmed) {
		return "";
	}

	if (
		trimmed === "}" ||
		trimmed === "{" ||
		trimmed === "[]" ||
		trimmed === "{}"
	) {
		logger.warn(
			`[LLM:${traceId}] Model returned stray bracket/empty payload: "${trimmed}". Suppressing reply.`,
		);
		return "";
	}

	const jsonStr = tryExtractJsonString(trimmed);
	if (jsonStr) {
		const jsonReply = handleJsonReply(jsonStr, responseText, traceId);
		if (jsonReply) return stripEmoji(jsonReply).trim();
	}

	return stripEmoji(trimmed).trim();
}
