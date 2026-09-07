export function getChatDisplayName(chat: {
	chat_id: string;
	title?: string | null;
}): string {
	const rawTitle = (chat.title || "").normalize("NFC").trim();
	if (
		rawTitle &&
		rawTitle !== "Whitelisted Chat" &&
		rawTitle !== "Seeded Group"
	) {
		return rawTitle;
	}
	return chat.chat_id.startsWith("-")
		? `Group (${chat.chat_id})`
		: `Chat (${chat.chat_id})`;
}

/**
 * Strips legacy date-time stamp and author prefix (e.g. "[21.08.2026 21:38] Ket:")
 * from memory text since created_at and user identity are already displayed separately in card view.
 */
export function cleanMemoryText(text: string): string {
	if (!text) return "";
	return text
		.replace(
			/^\[\d{1,4}[./-]\d{1,2}[./-]\d{2,4}(?:[,\s]+\d{1,2}:\d{2}(?::\d{2})?)?\]\s*(?:[^:\n]{1,50}:\s*)?/u,
			"",
		)
		.trim();
}

/**
 * Normalizes text for accent-insensitive and locale-aware search matching.
 */
export function normalizeSearchText(text: string): string {
	return (text || "")
		.toLocaleLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}
