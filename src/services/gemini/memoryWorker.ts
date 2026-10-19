import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { getLlmProvider } from "../llm/index";
import { processNewMemory } from "./memory";

const MEMORY_UPDATE_ITEM_SCHEMA = {
	type: "OBJECT",
	properties: {
		user_id: {
			type: "INTEGER",
			description:
				"The exact integer user_id from the [User #<id> | ...] tag of the speaker.",
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
	required: ["user_id", "fact"],
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

	backgroundCounter.set(chatIdStr, 0);
	runBackgroundMemoryExtraction(chatIdStr).catch((err) => {
		logger.error(
			`[MemoryWorker] Background extraction error for chat ${chatIdStr}:`,
			err,
		);
	});
}

function buildExtractionPrompt(humanMessages: MessageRow[]): string {
	const formattedHistory = humanMessages
		.map((msg) => {
			const handle = msg.username ? ` (@${msg.username})` : "";
			return `[User #${msg.user_id} | ${msg.first_name || "Unnamed"}${handle}]: ${msg.text || "[Media]"}`;
		})
		.join("\n");

	return `Analyze the following group chat user statements.
Identify any stated personal facts, user preferences, locations, plans, life updates, purchases, or events about the users in the log.
Note: Entries marked as [Ses Kaydı] (voice transcription) and [Image] (image description) represent real user statements and media shared in the chat. Extract factual information from them as well (e.g. bought a new motorcycle, went to a concert, shared an event ticket/invoice).
Do NOT invent facts. Do NOT save jokes or sarcasm.

Return ONLY a JSON array of extracted facts, each linked to the speaker's exact integer user_id.

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

async function saveExtractedMemories(
	chatIdStr: string,
	extractedList: unknown[],
	humanMessages: MessageRow[],
): Promise<number> {
	if (!Array.isArray(extractedList) || extractedList.length === 0) return 0;

	const participants = new Map<number, string>();
	for (const msg of humanMessages) {
		if (msg.user_id > 0) {
			participants.set(msg.user_id, msg.first_name || "User");
		}
	}

	let savedCount = 0;
	for (const item of extractedList as Array<{
		user_id?: number;
		fact?: string;
		category?: string;
		ttl_days?: number;
	}>) {
		const userId = item.user_id;
		const fact = item.fact?.trim();
		if (typeof userId !== "number" || !participants.has(userId) || !fact) {
			continue;
		}
		if (Repository.isUserOptedOut(userId)) {
			continue;
		}

		const userName = participants.get(userId) || "User";
		const cat =
			(item.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE";

		await processNewMemory(chatIdStr, `${userName}: ${fact}`, {
			userId,
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
	const humanMessages = recentMessages.filter(
		(m) => !m.is_bot_reply && m.user_id > 0,
	);
	if (humanMessages.length < 3) return;

	const prompt = buildExtractionPrompt(humanMessages);
	logger.info(
		`[MemoryWorker] Running background memory extraction for chat ${chatIdStr}...`,
	);

	try {
		const extractedList = await getLlmProvider().generateStructured<unknown[]>(
			prompt,
			getExtractionSchema(),
			"You are a quiet background memory analyzer for a Telegram group bot. Extract factual details about users. Output strictly JSON.",
		);

		const savedCount = await saveExtractedMemories(
			chatIdStr,
			extractedList,
			humanMessages,
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
