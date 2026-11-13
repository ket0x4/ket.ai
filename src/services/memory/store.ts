import {
	type MemoryCategory,
	type MemoryItem,
	Repository,
} from "../../db/repository";
import logger from "../../utils/logger";
import { dotProduct, normalizeVector } from "../../utils/vector";
import { consolidateMemories } from "./consolidation";
import {
	CONSOLIDATION_INTERVAL,
	DUPLICATE_SIMILARITY,
	MAX_TRACKED_CHATS,
} from "./constants";
import { generateEmbedding } from "./embedding";

const newMemoriesCount = new Map<string, number>();

function isDuplicateMemory(
	embedding: Float32Array,
	existing: MemoryItem[],
	newUserId?: number | null,
): boolean {
	for (const memory of existing) {
		if (!memory.embedding || memory.embedding.length === 0) continue;
		if (
			typeof newUserId === "number" &&
			typeof memory.userId === "number" &&
			newUserId !== memory.userId
		) {
			continue;
		}
		// Stored embeddings are normalized before insertion.
		if (dotProduct(embedding, memory.embedding) > DUPLICATE_SIMILARITY) {
			return true;
		}
	}
	return false;
}

function handleConsolidationCounter(chatId: string): void {
	const count = (newMemoriesCount.get(chatId) || 0) + 1;
	if (count >= CONSOLIDATION_INTERVAL) {
		newMemoriesCount.set(chatId, 0);
		consolidateMemories(chatId).catch((error) =>
			logger.error("Memory consolidation error:", error),
		);
		return;
	}

	newMemoriesCount.set(chatId, count);
	if (newMemoriesCount.size > MAX_TRACKED_CHATS) {
		const firstKey = newMemoriesCount.keys().next().value;
		if (firstKey) newMemoriesCount.delete(firstKey);
	}
}

export async function processNewMemory(
	chatId: string,
	content: string,
	options?: {
		userId?: number | null;
		category?: MemoryCategory;
		ttlDays?: number | null;
	},
): Promise<void> {
	const text = content?.trim();
	if (!text || !chatId) return;
	if (options?.userId === 0) return;

	if (options?.userId && Repository.isUserOptedOut(options.userId)) {
		logger.debug(
			`[Memory Store] Skipped memory for opted-out user ${options.userId} in chat ${chatId}:`,
			text,
		);
		return;
	}

	// Facts extracted from groups are stored as "name: fact"; honor opt-outs
	// expressed through the username prefix as well as the numeric user ID.
	const colonIndex = text.indexOf(":");
	if (colonIndex > 0) {
		const prefix = text.slice(0, colonIndex).trim();
		if (Repository.isUsernameOptedOut(prefix)) {
			logger.debug(
				`[Memory Store] Skipped memory for opted-out username "${prefix}" in chat ${chatId}:`,
				text,
			);
			return;
		}
	}

	const existing = Repository.getMemories(chatId);
	const normalizedText = text.toLowerCase();
	if (
		existing.some(
			(memory) => memory.text.trim().toLowerCase() === normalizedText,
		)
	) {
		logger.debug(
			`[Memory Store] Skipped exact duplicate memory for chat ${chatId}:`,
			text,
		);
		return;
	}

	const rawEmbedding = await generateEmbedding(text);
	if (rawEmbedding.length === 0) {
		logger.warn(
			`[Memory Store] Skipped memory for chat ${chatId} due to embedding failure:`,
			text,
		);
		return;
	}

	const embedding = normalizeVector(rawEmbedding);
	if (isDuplicateMemory(embedding, existing, options?.userId)) {
		logger.debug(
			`[Memory Store] Skipped semantically duplicate memory for chat ${chatId}:`,
			text,
		);
		return;
	}

	logger.info(`[Memory Store] Adding memory to chat ${chatId}:`, text);
	Repository.addMemory(chatId, text, embedding, options);
	handleConsolidationCounter(chatId);
}
