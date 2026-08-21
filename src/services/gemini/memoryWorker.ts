import { CONFIG } from "../../config/index";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { ai } from "./client";
import { processNewMemory } from "./memory";
import { getThinkingConfig, runWithRetry } from "./utils";

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
Note: Entries marked as [Ses Kaydı] (voice transcription) and [Görsel] (image description) represent real user statements and media shared in the chat. Extract factual information from them as well (e.g. bought a new motorcycle, went to a concert, shared an event ticket/invoice).
Do NOT invent facts. Do NOT save jokes, sarcasm, or bot responses.

Return ONLY a JSON array of extracted facts.

Chat Log:
${formattedHistory}`;
}

function getExtractionSchema(): Record<string, unknown> {
	return {
		type: "ARRAY",
		items: {
			type: "OBJECT",
			properties: {
				user_id: {
					type: "INTEGER",
					description:
						"The integer user_id extracted from User_ID field if available.",
				},
				user_name: {
					type: "STRING",
					description: "First name of the user.",
				},
				fact: {
					type: "STRING",
					description:
						"Factual statement (e.g. 'likes coffee', 'moved to Ankara'). Do not use word 'User'.",
				},
				category: {
					type: "STRING",
					description:
						"'PROFILE' for permanent facts, 'DYNAMIC' for medium-term, 'TEMPORARY' for upcoming events.",
				},
				ttl_days: {
					type: "INTEGER",
					description:
						"Expiry in days for temporary facts, or null/0 for permanent facts.",
				},
			},
			required: ["user_name", "fact"],
		},
	};
}

async function saveExtractedMemories(
	chatIdStr: string,
	extractedList: unknown[],
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
		const combinedFact = `${item.user_name}: ${item.fact}`;
		const cat =
			(item.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE";
		const ttl =
			typeof item.ttl_days === "number" && item.ttl_days > 0
				? item.ttl_days
				: null;

		await processNewMemory(chatIdStr, combinedFact, {
			userId: typeof item.user_id === "number" ? item.user_id : null,
			category: cat,
			ttlDays: ttl,
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
					temperature: 0.2,
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
		const savedCount = await saveExtractedMemories(chatIdStr, extractedList);

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
