import type { MessageRow } from "../../db/repository";
import { cleanUserText } from "../../utils/text";

const ANAPHORIC_TRIGGERS =
	/\b(?:o|onun|ona|onlar|orası|oraya|oradan|orada|burası|buraya|neredeydi|nerede|kimdi|kimin|neydi|nedir|ne zaman|hangisi|bu|bunu|bunun|buna|şu|şunu|bahsettiğin|bahsettiği|dediğin|dediği|bahsettiğimiz|what|where|who|when|which|it|that|there|they|him|her)\b/i;

/**
 * Enriches a RAG retrieval query with recent conversational context if anaphora/pronouns or short questions are detected.
 */
export function expandContextualQuery(
	query: string,
	history: MessageRow[] = [],
	activeTopic?: string,
): string {
	const cleanQuery = query.trim();
	const isAnaphoric = ANAPHORIC_TRIGGERS.test(cleanQuery);
	if (!isAnaphoric) {
		return cleanQuery;
	}

	let contextSnippet = "";
	if (history.length > 0) {
		const recentUserMsgs = history
			.slice(-4)
			.filter((m) => !m.is_bot_reply && m.text?.trim())
			.map((m) => cleanUserText(m.text))
			.filter((t) => t && t !== cleanQuery);

		if (recentUserMsgs.length > 0) {
			contextSnippet = recentUserMsgs.slice(-2).join(" ");
		}
	}

	const parts: string[] = [];
	if (contextSnippet) {
		parts.push(contextSnippet);
	}
	if (cleanQuery) {
		parts.push(cleanQuery);
	}
	if (
		!contextSnippet &&
		activeTopic &&
		activeTopic !== "General chat is going on, no specific topic."
	) {
		parts.push(`Topic: ${activeTopic}`);
	}

	return parts.join(" | ") || cleanQuery;
}
