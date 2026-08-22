import { CONFIG } from "../../config/index";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { cosineSimilarity } from "../../utils/vector";
import { ai } from "./client";
import { getThinkingConfig, type RequestPriority, runWithRetry } from "./utils";

const newMemoriesCount = new Map<string, number>();
const MAX_TRACKED_CHATS = 200;

export async function generateEmbedding(
	text: string,
	taskType:
		| "RETRIEVAL_DOCUMENT"
		| "RETRIEVAL_QUERY"
		| "SEMANTIC_SIMILARITY" = "RETRIEVAL_DOCUMENT",
	priority: RequestPriority = "high",
): Promise<number[]> {
	try {
		const response = await runWithRetry(
			() =>
				ai.models.embedContent({
					model: "gemini-embedding-2",
					contents: text,
					config: {
						taskType,
					},
				}),
			{ priority },
		);
		return response.embeddings?.[0]?.values || [];
	} catch (error) {
		logger.error("Error generating embedding:", error);
		return [];
	}
}

function isDuplicateMemory(
	emb: Float32Array | number[],
	existing: Array<{ embedding: Float32Array; userId?: number | null }>,
	newUserId?: number | null,
): boolean {
	for (const m of existing) {
		if (!m.embedding || m.embedding.length === 0) continue;
		// If userIds are explicitly known and different, they belong to different users
		if (
			typeof newUserId === "number" &&
			typeof m.userId === "number" &&
			newUserId !== m.userId
		) {
			continue;
		}
		const sim = cosineSimilarity(emb, m.embedding);
		if (sim > 0.88) return true;
	}
	return false;
}

function handleMemoryConsolidationCounter(chatIdStr: string): void {
	const count = (newMemoriesCount.get(chatIdStr) || 0) + 1;
	if (count >= 20) {
		newMemoriesCount.set(chatIdStr, 0);
		consolidateMemories(chatIdStr).catch((e) =>
			logger.error("Memory consolidation error:", e),
		);
		return;
	}
	newMemoriesCount.set(chatIdStr, count);
	if (newMemoriesCount.size > MAX_TRACKED_CHATS) {
		const firstKey = newMemoriesCount.keys().next().value;
		if (firstKey) newMemoriesCount.delete(firstKey);
	}
}

export async function processNewMemory(
	chatIdStr: string,
	memoryText: string,
	options?: {
		userId?: number | null;
		category?: "PROFILE" | "DYNAMIC" | "TEMPORARY";
		ttlDays?: number | null;
		priority?: RequestPriority;
	},
) {
	if (!memoryText?.trim() || !chatIdStr) return;

	const memText = memoryText.trim();
	const existing = Repository.getMemories(chatIdStr);

	// Fast exact text deduplication before invoking embedding API
	const normalizedText = memText.toLowerCase();
	const exactMatch = existing.find(
		(m) => m.text.trim().toLowerCase() === normalizedText,
	);
	if (exactMatch) {
		logger.debug(
			`[Memory Store] Skipped exact duplicate memory for chat ${chatIdStr}:`,
			memText,
		);
		return;
	}

	const priority = options?.priority ?? "low";
	const emb = await generateEmbedding(memText, "RETRIEVAL_DOCUMENT", priority);
	if (emb.length === 0) {
		logger.warn(
			`[Memory Store] Skipped memory for chat ${chatIdStr} due to embedding failure:`,
			memText,
		);
		return;
	}

	if (isDuplicateMemory(emb, existing, options?.userId)) {
		logger.debug(
			`[Memory Store] Skipped semantically duplicate memory for chat ${chatIdStr}:`,
			memText,
		);
		return;
	}

	logger.info(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
	Repository.addMemory(chatIdStr, memText, emb, options);
	handleMemoryConsolidationCounter(chatIdStr);
}

interface MemoryDiagnosticItem {
	id: number;
	text: string;
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY";
	createdAt: number;
	ageInDays: number;
	cosSim: number;
	recencyBoost: number;
	finalScore: number;
	passedThreshold: boolean;
	selected: boolean;
}

function createDefaultDiagnosticItem(m: {
	id: number;
	text: string;
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY";
	createdAt: number;
}): MemoryDiagnosticItem {
	return {
		id: m.id,
		text: m.text,
		category: m.category,
		createdAt: m.createdAt,
		ageInDays: 0,
		cosSim: 0,
		recencyBoost: 0,
		finalScore: -1,
		passedThreshold: false,
		selected: false,
	};
}

export interface MemoryQueryDiagnostics {
	chatId: string;
	originalQuery: string;
	enrichedQuery: string;
	embeddingDimensions: number;
	embeddingTimeMs: number;
	totalMemoriesInChat: number;
	threshold: number;
	topK: number;
	evaluatedCount: number;
	matchedCount: number;
	retrievedMemories: string[];
	details: MemoryDiagnosticItem[];
}

export async function queryMemoriesWithDiagnostics(
	chatId: string,
	query: string,
	options?: {
		activeTopic?: string;
		topK?: number;
		threshold?: number;
	},
): Promise<MemoryQueryDiagnostics> {
	// Automatically clean up expired memories first
	Repository.pruneExpiredMemories(chatId);

	const allMemories = Repository.getMemories(chatId);
	const cleanQuery = query.trim();
	const activeTopic = options?.activeTopic;
	const enrichedQuery =
		activeTopic &&
		activeTopic !== "General chat is going on, no specific topic."
			? `${cleanQuery} | Topic: ${activeTopic}`
			: cleanQuery;

	const threshold = options?.threshold ?? 0.6;
	const topK = options?.topK ?? 5;

	if (allMemories.length === 0) {
		return {
			chatId,
			originalQuery: cleanQuery,
			enrichedQuery,
			embeddingDimensions: 0,
			embeddingTimeMs: 0,
			totalMemoriesInChat: 0,
			threshold,
			topK,
			evaluatedCount: 0,
			matchedCount: 0,
			retrievedMemories: [],
			details: [],
		};
	}

	const startTime = Date.now();
	const queryEmbedding = await generateEmbedding(
		enrichedQuery,
		"RETRIEVAL_QUERY",
		"high",
	);
	const embeddingTimeMs = Date.now() - startTime;

	if (queryEmbedding.length === 0) {
		logger.warn(
			`[Memory RAG] Query embedding failed for chat ${chatId}. Skipping RAG retrieval.`,
		);
		return {
			chatId,
			originalQuery: cleanQuery,
			enrichedQuery,
			embeddingDimensions: 0,
			embeddingTimeMs,
			totalMemoriesInChat: allMemories.length,
			threshold,
			topK,
			evaluatedCount: allMemories.length,
			matchedCount: 0,
			retrievedMemories: [],
			details: allMemories.map(createDefaultDiagnosticItem),
		};
	}

	const now = Math.floor(Date.now() / 1000);

	// Calculate hybrid similarity score (Category-aware: PROFILE facts never decay, TEMPORARY decays fast)
	const details: MemoryDiagnosticItem[] = allMemories.map((m) => {
		if (!m.embedding || m.embedding.length === 0) {
			return createDefaultDiagnosticItem(m);
		}

		const cosSim = cosineSimilarity(queryEmbedding, m.embedding);
		const ageInDays = Math.max(0, (now - m.createdAt) / 86400);

		let recencyBoost = 1.0;
		let finalScore = cosSim;

		if (m.category === "TEMPORARY") {
			// Temporary events decay quickly (e.g. half-life 3 days)
			recencyBoost = Math.exp(-0.25 * ageInDays);
			finalScore = 0.7 * cosSim + 0.3 * recencyBoost;
		} else if (m.category === "DYNAMIC") {
			// Medium-term updates decay moderately (half-life 14 days)
			recencyBoost = Math.exp(-0.05 * ageInDays);
			finalScore = 0.85 * cosSim + 0.15 * recencyBoost;
		} else {
			// PROFILE: permanent traits (birthday, job, likes, etc.) do NOT decay with age!
			recencyBoost = Math.exp(-0.01 * ageInDays);
			finalScore = Math.max(cosSim, 0.95 * cosSim + 0.05 * recencyBoost);
		}

		return {
			id: m.id,
			text: m.text,
			category: m.category,
			createdAt: m.createdAt,
			ageInDays: Math.round(ageInDays * 100) / 100,
			cosSim: Math.round(cosSim * 10000) / 10000,
			recencyBoost: Math.round(recencyBoost * 10000) / 10000,
			finalScore: Math.round(finalScore * 10000) / 10000,
			passedThreshold: finalScore >= threshold,
			selected: false,
		};
	});

	details.sort((a, b) => b.finalScore - a.finalScore);

	const retrievedMemories: string[] = [];
	let matchedCount = 0;

	for (const item of details) {
		if (item.passedThreshold) {
			matchedCount++;
			if (retrievedMemories.length < topK) {
				item.selected = true;
				retrievedMemories.push(item.text);
			}
		}
	}

	return {
		chatId,
		originalQuery: cleanQuery,
		enrichedQuery,
		embeddingDimensions: queryEmbedding.length,
		embeddingTimeMs,
		totalMemoriesInChat: allMemories.length,
		threshold,
		topK,
		evaluatedCount: details.length,
		matchedCount,
		retrievedMemories,
		details,
	};
}

export async function getRelevantMemories(
	chatId: string,
	query: string,
	activeTopic?: string,
	topK = 5,
): Promise<string[]> {
	const diag = await queryMemoriesWithDiagnostics(chatId, query, {
		activeTopic,
		topK,
		threshold: 0.6,
	});

	if (diag.retrievedMemories.length > 0) {
		logger.debug(
			`[Memory RAG] Retrieved ${diag.retrievedMemories.length} memories for query: "${diag.enrichedQuery}"`,
		);
		logger.debug(`[Memory RAG] Memories:`, diag.retrievedMemories);
	}
	return diag.retrievedMemories;
}

async function consolidateMemories(chatIdStr: string) {
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
		const response = await runWithRetry(
			() =>
				ai.models.generateContent({
					model: CONFIG.GEMINI_MODEL,
					contents: prompt,
					config: {
						systemInstruction:
							"You are an automated data maintenance service. Analyze stored memories and identify redundant or contradictory memory IDs for deletion. Return strictly JSON.",
						temperature: 0.1,
						maxOutputTokens: 2048,
						thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
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
			{ priority: "low" },
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
