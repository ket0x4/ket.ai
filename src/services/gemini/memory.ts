import { CONFIG } from "../../config/index";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { cosineSimilarity } from "../../utils/vector";
import { ai } from "./client";
import { runWithRetry } from "./utils";

const newMemoriesCount = new Map<string, number>();
const MAX_TRACKED_CHATS = 200;

export async function generateEmbedding(
	text: string,
	taskType:
		| "RETRIEVAL_DOCUMENT"
		| "RETRIEVAL_QUERY"
		| "SEMANTIC_SIMILARITY" = "RETRIEVAL_DOCUMENT",
): Promise<number[]> {
	try {
		const response = await runWithRetry(() =>
			ai.models.embedContent({
				model: "gemini-embedding-2",
				contents: text,
				config: {
					taskType,
				},
			}),
		);
		return response.embeddings?.[0]?.values || [];
	} catch (error) {
		logger.error("Error generating embedding:", error);
		return [];
	}
}

export async function processNewMemory(
	chatIdStr: string,
	memoryText: string,
	options?: {
		userId?: number | null;
		category?: "PROFILE" | "DYNAMIC" | "TEMPORARY";
		ttlDays?: number | null;
	},
) {
	if (!memoryText?.trim() || !chatIdStr) return;

	const dateStr = new Date().toLocaleString("tr-TR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const memText = `[${dateStr}] ${memoryText.trim()}`;
	const emb = await generateEmbedding(memText, "RETRIEVAL_DOCUMENT");
	if (emb.length === 0) {
		logger.warn(
			`[Memory Store] Skipped memory for chat ${chatIdStr} due to embedding failure:`,
			memText,
		);
		return;
	}

	const existing = Repository.getMemories(chatIdStr);
	const idsToDelete: number[] = [];

	for (const m of existing) {
		if (m.embedding.length === 0) continue;
		const sim = cosineSimilarity(emb, m.embedding);

		// Exact duplicate check
		if (sim > 0.85) {
			logger.debug(
				`[Memory Store] Skipped duplicate memory for chat ${chatIdStr}:`,
				memText,
			);
			return;
		}
	}

	if (idsToDelete.length > 0) {
		Repository.deleteMemoriesByIds(idsToDelete, chatIdStr);
	}

	logger.info(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
	Repository.addMemory(chatIdStr, memText, emb, options);

	const count = (newMemoriesCount.get(chatIdStr) || 0) + 1;
	if (count >= 20) {
		newMemoriesCount.set(chatIdStr, 0);
		consolidateMemories(chatIdStr).catch((e) =>
			logger.error("Memory consolidation error:", e),
		);
	} else {
		newMemoriesCount.set(chatIdStr, count);
		// Prune map if it grows too large
		if (newMemoriesCount.size > MAX_TRACKED_CHATS) {
			const firstKey = newMemoriesCount.keys().next().value;
			if (firstKey) newMemoriesCount.delete(firstKey);
		}
	}
}

export async function getRelevantMemories(
	chatId: string,
	query: string,
	activeTopic?: string,
	topK = 5,
): Promise<string[]> {
	// Automatically clean up expired memories first
	Repository.pruneExpiredMemories(chatId);

	const allMemories = Repository.getMemories(chatId);
	if (allMemories.length === 0) return [];

	// Enrich query with active topic if available for better semantic matching
	const cleanQuery = query.trim();
	const enrichedQuery =
		activeTopic &&
		activeTopic !== "General chat is going on, no specific topic."
			? `${cleanQuery} | Topic: ${activeTopic}`
			: cleanQuery;

	const queryEmbedding = await generateEmbedding(
		enrichedQuery,
		"RETRIEVAL_QUERY",
	);
	if (queryEmbedding.length === 0) {
		logger.warn(
			`[Memory RAG] Query embedding failed for chat ${chatId}. Skipping RAG retrieval.`,
		);
		return [];
	}

	const now = Math.floor(Date.now() / 1000);

	// Calculate hybrid similarity score (85% Cosine Similarity + 15% Recency Decay)
	const scored = allMemories.map((m) => {
		if (m.embedding.length === 0) return { text: m.text, score: -1 };

		const cosSim = cosineSimilarity(queryEmbedding, m.embedding);
		const ageInDays = Math.max(0, (now - m.createdAt) / 86400);
		const recencyBoost = Math.exp(-0.05 * ageInDays); // Exponential time-decay factor

		const finalScore = 0.85 * cosSim + 0.15 * recencyBoost;
		return { text: m.text, score: finalScore };
	});

	scored.sort((a, b) => b.score - a.score);
	const THRESHOLD = 0.6;
	const topMemories = scored
		.filter((s) => s.score >= THRESHOLD)
		.slice(0, topK)
		.map((s) => s.text);

	if (topMemories.length > 0) {
		logger.debug(
			`[Memory RAG] Retrieved ${topMemories.length} memories for query: "${enrichedQuery}"`,
		);
		logger.debug(`[Memory RAG] Memories:`, topMemories);
	}
	return topMemories;
}

export async function consolidateMemories(chatIdStr: string) {
	const allMemories = Repository.getMemories(chatIdStr);
	if (allMemories.length < 10) return;

	const memoryListText = allMemories
		.map((m) => `ID: ${m.id} | ${m.text}`)
		.join("\n");

	const prompt = `Review the following memory list.
Find exact duplicates, resolved contradictions, or completely useless/spam facts.
Return ONLY a JSON array of the integer IDs of memories that should be permanently DELETED. Return an empty array [] if all memories are important and distinct.

Memories:
${memoryListText}`;

	logger.info(
		`[Memory Consolidation] Triggered for chat ${chatIdStr}. Analyzing ${allMemories.length} memories...`,
	);

	try {
		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				contents: prompt,
				config: {
					systemInstruction:
						"You are an automated data maintenance service. Analyze stored memories and identify redundant or contradictory memory IDs for deletion. Return strictly JSON.",
					temperature: 0.1,
					responseMimeType: "application/json",
					responseSchema: {
						type: "ARRAY",
						items: {
							type: "INTEGER",
						},
						description: "List of memory IDs to delete",
					},
				},
			}),
		);

		const responseText = response.text?.trim() || "[]";
		const idsToDelete: number[] = JSON.parse(responseText);

		if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
			Repository.deleteMemoriesByIds(idsToDelete, chatIdStr);
			logger.info(
				`[Memory Consolidation] Successfully deleted ${idsToDelete.length} redundant/spam memories for chat ${chatIdStr}.`,
			);
		} else {
			logger.info(
				`[Memory Consolidation] No redundant memories found for chat ${chatIdStr}.`,
			);
		}
	} catch (error) {
		logger.error(
			`[Memory Consolidation] Error during consolidation for chat ${chatIdStr}:`,
			error,
		);
	}
}
