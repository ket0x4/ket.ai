import { CONFIG } from "../../config/index";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { ai } from "./client";
import { processNewMemory } from "./memory";
import { getThinkingConfig, resolveTargetUserId, runWithRetry } from "./utils";

export const MEMORY_UPDATE_ITEM_SCHEMA = {
	type: "OBJECT",
	properties: {
		user_id: {
			type: "INTEGER",
			description:
				"The integer user_id extracted from User_ID field if available.",
		},
		user_name: {
			type: "STRING",
			description: "The first name of the user who stated the fact.",
		},
		fact: {
			type: "STRING",
			description:
				"The factual detail stated by the user. Do not use the word 'User'.",
		},
		category: {
			type: "STRING",
			description:
				"Category of fact: 'PROFILE' for permanent facts, 'DYNAMIC' for medium-term status, 'TEMPORARY' for short-lived events.",
		},
		ttl_days: {
			type: "INTEGER",
			description:
				"Days after which temporary memory expires. Leave null or 0 for permanent facts.",
		},
	},
	required: ["user_name", "fact"],
};

const backgroundCounter = new Map<string, number>();
const MAX_TRACKED_CHATS = 200;

/**
 * Increments message counter for a chat and triggers background memory extraction every 15 messages.
 */
export async function checkAndRunBackgroundMemoryExtraction(
	chatIdStr: string,
): Promise<void> {
	const count = (backgroundCounter.get(chatIdStr) || 0) + 1;
	if (count < 15) {
		backgroundCounter.set(chatIdStr, count);
		// Prune map if it grows too large
		if (backgroundCounter.size > MAX_TRACKED_CHATS) {
			const firstKey = backgroundCounter.keys().next().value;
			if (firstKey) backgroundCounter.delete(firstKey);
		}
		return;
	}

	// Reset counter and run background extraction asynchronously
	backgroundCounter.set(chatIdStr, 0);
	runBackgroundMemoryExtraction(chatIdStr).catch((err) => {
		logger.error(
			`[MemoryWorker] Background extraction error for chat ${chatIdStr}:`,
			err,
		);
	});
}

function buildExtractionPrompt(recentMessages: MessageRow[]): string {
	const formattedHistory = recentMessages
		.map((msg) => {
			const sender = msg.is_bot_reply
				? "Bot (ket.ai)"
				: `User_${msg.user_id} (${msg.first_name || "Unnamed"})`;
			return `${sender}: ${msg.text || "[Media]"}`;
		})
		.join("\n");

	return `Analyze the following group chat conversation log.
Identify any stated personal facts, user preferences, locations, plans, life updates, purchases, or events about users in the chat.
Note: Entries marked as [Ses Kaydı] (voice transcription) and [Image] (image description) represent real user statements and media shared in the chat. Extract factual information from them as well (e.g. bought a new motorcycle, went to a concert, shared an event ticket/invoice).
Do NOT invent facts. Do NOT save jokes, sarcasm, or bot responses.

Return ONLY a JSON array of extracted facts.

Chat Log:
${formattedHistory}`;
}

function getExtractionSchema(): Record<string, unknown> {
	return {
		type: "ARRAY",
		items: MEMORY_UPDATE_ITEM_SCHEMA,
	};
}

function resolveTtl(category: string, ttlDays?: number): number | null {
	if (typeof ttlDays === "number" && ttlDays > 0) return ttlDays;
	return category === "TEMPORARY" ? 3 : null;
}

function isOptedOut(targetUserId?: number, userName?: string): boolean {
	if (targetUserId && Repository.isUserOptedOut(targetUserId)) {
		logger.debug(
			`[MemoryWorker] Skipped saving memory for opted-out user ${targetUserId}`,
		);
		return true;
	}
	if (userName && Repository.isUsernameOptedOut(userName)) {
		logger.debug(
			`[MemoryWorker] Skipped saving memory for opted-out username "${userName}"`,
		);
		return true;
	}
	return false;
}

export async function saveExtractedMemories(
	chatIdStr: string,
	extractedList: unknown[],
	recentMessages: MessageRow[] = [],
	senderUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): Promise<number> {
	if (!Array.isArray(extractedList) || extractedList.length === 0) return 0;

	let savedCount = 0;
	for (const item of extractedList as Array<{
		user_id?: number;
		user_name?: string;
		fact?: string;
		category?: string;
		ttl_days?: number;
	}>) {
		if (!item.user_name || !item.fact) continue;

		const targetUserId = resolveTargetUserId(
			item.user_name,
			item.user_id,
			recentMessages,
			senderUserId,
			senderFirstName,
			senderUsername,
		);

		if (isOptedOut(targetUserId ?? undefined, item.user_name)) continue;

		const cat =
			(item.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE";

		await processNewMemory(chatIdStr, `${item.user_name}: ${item.fact}`, {
			userId: targetUserId ?? undefined,
			category: cat,
			ttlDays: resolveTtl(cat, item.ttl_days),
		});
		savedCount++;
	}
	return savedCount;
}

/**
 * Analyzes recent group chat messages to extract user facts even if bot didn't respond.
 */
async function runBackgroundMemoryExtraction(chatIdStr: string): Promise<void> {
	const recentMessages = Repository.getRecentMessages(chatIdStr, 20);
	if (recentMessages.length < 3) return;

	const prompt = buildExtractionPrompt(recentMessages);
	logger.info(
		`[MemoryWorker] Running background memory extraction for chat ${chatIdStr}...`,
	);

	try {
		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				contents: prompt,
				config: {
					systemInstruction:
						"You are a quiet background memory analyzer for a Telegram group bot. Extract factual details about users. Output strictly JSON.",
					maxOutputTokens: 2048,
					thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
					responseMimeType: "application/json",
					// biome-ignore lint/suspicious/noExplicitAny: SDK schema typing
					responseSchema: getExtractionSchema() as any,
				},
			}),
		);

		const responseText = response.text?.trim() || "[]";
		const extractedList = JSON.parse(responseText);
		const savedCount = await saveExtractedMemories(
			chatIdStr,
			extractedList,
			recentMessages,
		);

		if (savedCount > 0) {
			logger.info(
				`[MemoryWorker] Background extraction saved ${savedCount} memories for chat ${chatIdStr}.`,
			);
		}
	} catch (error) {
		logger.error(
			`[MemoryWorker] Failed background extraction for chat ${chatIdStr}:`,
			error,
		);
	}
}
