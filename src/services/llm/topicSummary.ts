import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { openAiProvider } from "./openAiProvider";

const lastSummarizedCount = new Map<string, number>();
const MAX_TRACKED_CHATS = 200;

function recordSummarizedCount(chatIdStr: string, count: number): void {
	lastSummarizedCount.set(chatIdStr, count);
	if (lastSummarizedCount.size > MAX_TRACKED_CHATS) {
		const firstKey = lastSummarizedCount.keys().next().value;
		if (firstKey) lastSummarizedCount.delete(firstKey);
	}
}

export async function summarizeTopic(history: MessageRow[]): Promise<string> {
	try {
		if (history.length === 0) return "";

		const lines = history
			.slice(-20)
			.map((msg) => {
				const sender = msg.is_bot_reply ? "ket.ai" : msg.first_name || "User";
				const text = (msg.text || "[Media]").slice(0, 150);
				return `${sender}: ${text}`;
			})
			.join("\n");

		const schema = {
			type: "OBJECT",
			properties: {
				summary: {
					type: "STRING",
					description: "1-2 sentence summary of the current chat topic.",
				},
			},
			required: ["summary"],
		};

		const parsed = await openAiProvider.generateStructured<{
			summary?: string;
		}>(
			`Summarize the main topic of this conversation in 1-2 short sentences:\n\n${lines}`,
			schema,
			"Summarize group chats in 1-2 concise sentences.",
		);

		return typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
	} catch (error) {
		logger.error("Error in summarizeTopic:", error);
		return "";
	}
}

/**
 * Keeps the per-chat topic summary fresh: summarizes in the background once
 * enough new messages have arrived, and returns the current summary.
 */
export async function ensureTopicSummary(
	chatIdStr: string,
	currentTopic: string | null,
): Promise<string> {
	const currentCount = Repository.getMessageCount(chatIdStr);
	if (currentTopic && !lastSummarizedCount.has(chatIdStr)) {
		recordSummarizedCount(chatIdStr, currentCount);
		return currentTopic;
	}

	const lastCount = lastSummarizedCount.get(chatIdStr) || 0;
	const shouldSummarize =
		(!currentTopic && currentCount >= 6) || currentCount - lastCount >= 10;

	if (shouldSummarize) {
		recordSummarizedCount(chatIdStr, currentCount);
		const history = Repository.getRecentMessages(chatIdStr, 20);
		void summarizeTopic(history)
			.then((summary) => {
				if (summary) {
					Repository.updateChatSettings(chatIdStr, {
						current_topic: summary,
					});
					logger.info(
						`[Summarizer] Updated topic summary for ${chatIdStr}: "${summary}"`,
					);
				}
			})
			.catch((err) => {
				logger.warn(`[Summarizer] Background summary failed:`, err);
			});
	}

	return currentTopic || "";
}
