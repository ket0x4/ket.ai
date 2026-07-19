import { Repository } from "../db/repository";

/**
 * Detects if a message is a quick follow-up in an ongoing conversation.
 * A follow-up is when the same user sends another message within 45 seconds
 * after the bot replied to their previous message.
 */
export function isConversationFollowUp(
  chatId: string,
  userId: number,
  messageDate: number
): boolean {
  const recent = Repository.getRecentMessages(chatId, 3);
  if (recent.length < 3) return false;

  const botMsg = recent[recent.length - 2];
  const userPrevMsg = recent[recent.length - 3];

  const timeDiff = messageDate - botMsg.sent_at;
  if (botMsg.is_bot_reply === 1 && timeDiff <= 45) {
    if (userPrevMsg.user_id === userId) {
      return true;
    }
  }

  return false;
}
