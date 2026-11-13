import type { MessageRow } from "../db/repository";

// Matches emoji bases (\p{Extended_Pictographic}), regional-indicator flags,
// variation selectors, skin-tone modifiers, ZWJ joins, and keycap combiners.
const EMOJI_REGEX =
	/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Variation_Selector}|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}|\u{200D}|\u{20E3})/gu;

/**
 * Removes emoji and pictographic characters from a reply so the no-emoji rule
 * is enforced deterministically instead of relying on the prompt alone.
 */
export function stripEmoji(text: string): string {
	if (!text) return text;
	return text.replace(EMOJI_REGEX, "");
}

/** Normalizes whitespace and strips direct @-mentions of the bot username. */
export function cleanUserText(
	text: string | null,
	botUsernameOverride?: string,
): string {
	if (!text) return "";
	const handle = botUsernameOverride?.trim().replace(/^@/, "");
	if (!handle) {
		return text.replace(/\s+/g, " ").trim();
	}
	const escapedHandle = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`(^|\\s)@${escapedHandle}\\b`, "gi");
	return text.replace(regex, " ").replace(/\s+/g, " ").trim();
}

/** Placeholder shown in prompts for messages whose content is media only. */
export function resolveMessageFallback(msg: MessageRow): string {
	if (msg.photo_file_id) return "[Photo]";
	if (msg.document_file_id) {
		return `[Document: ${msg.document_file_name || "file"}]`;
	}
	return "[Media]";
}
