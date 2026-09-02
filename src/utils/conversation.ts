import { Repository } from "../db/repository";

/**
 * Detects if a message is a quick follow-up in an ongoing conversation.
 * A follow-up is when the same user sends another message within 45 seconds
 * after the bot replied to their previous prompt.
 */
export function isConversationFollowUp(
	chatId: string,
	userId: number,
	messageDate: number,
	maxLookback = 10,
	maxTimeDiffSeconds = 45,
): boolean {
	const recent = Repository.getRecentMessages(chatId, maxLookback);
	if (recent.length === 0) return false;

	// Find the index of the most recent bot reply in recent messages
	let latestBotIdx = -1;
	for (let i = recent.length - 1; i >= 0; i--) {
		if (recent[i].is_bot_reply === 1) {
			latestBotIdx = i;
			break;
		}
	}

	if (latestBotIdx === -1) return false;

	const botMsg = recent[latestBotIdx];
	const timeDiff = messageDate - botMsg.sent_at;

	// Must be within follow-up window (allowing minor clock skew down to -5s)
	if (timeDiff > maxTimeDiffSeconds || timeDiff < -5) {
		return false;
	}

	// Scan backwards from the bot reply to find the user message that prompted it,
	// ignoring consecutive bot replies if the bot replied in multiple parts
	for (let i = latestBotIdx - 1; i >= 0; i--) {
		const prev = recent[i];
		if (prev.is_bot_reply === 1) {
			continue;
		}
		// First user message preceding the bot reply
		return prev.user_id === userId;
	}

	return false;
}
