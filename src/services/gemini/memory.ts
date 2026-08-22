import { CONFIG } from "../../config/index";
import {
	type MemoryItem,
	type MessageRow,
	Repository,
} from "../../db/repository";
import logger from "../../utils/logger";
import { dotProduct, normalizeVector } from "../../utils/vector";
import { ai } from "./client";
import {
	expandContextualQuery,
	getThinkingConfig,
	type RequestPriority,
	runWithRetry,
} from "./utils";

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
	existing: MemoryItem[],
	newUserId?: number | null,
): boolean {
	const normEmb = emb instanceof Float32Array ? emb : normalizeVector(emb);
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
		const targetEmb = m.normalizedEmbedding || normalizeVector(m.embedding);
		const sim = dotProduct(normEmb, targetEmb);
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
	const rawEmb = await generateEmbedding(
		memText,
		"RETRIEVAL_DOCUMENT",
		priority,
	);
	if (rawEmb.length === 0) {
		logger.warn(
			`[Memory Store] Skipped memory for chat ${chatIdStr} due to embedding failure:`,
			memText,
		);
		return;
	}

	const emb = normalizeVector(rawEmb);

	// Exact / Semantic deduplication (sim > 0.88)
	if (isDuplicateMemory(emb, existing, options?.userId)) {
		logger.debug(
			`[Memory Store] Skipped semantically duplicate memory for chat ${chatIdStr}:`,
			memText,
		);
		return;
	}

	// Slot replacement & conflict resolution (e.g. user updated location/status, 0.72 <= sim <= 0.88)
	if (typeof options?.userId === "number" && options.userId > 0) {
		const conflict = Repository.findSlotConflictForUser(
			chatIdStr,
			options.userId,
			emb,
			0.72,
			0.88,
		);
		if (conflict) {
			logger.info(
				`[Memory Store] Detected slot update for user ${options.userId} in chat ${chatIdStr}. Updating memory #${conflict.id}: "${conflict.text}" -> "${memText}"`,
			);
			Repository.updateMemory(
				conflict.id,
				memText,
				options?.category || conflict.category,
				emb,
				chatIdStr,
			);
			handleMemoryConsolidationCounter(chatIdStr);
			return;
		}
	}

	logger.info(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
	Repository.addMemory(chatIdStr, memText, emb, options);
	handleMemoryConsolidationCounter(chatIdStr);
}

function computeHybridScore(
	cosSim: number,
	createdAt: number,
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY",
	now: number,
): { ageInDays: number; recencyBoost: number; finalScore: number } {
	const ageInDays = Math.max(0, (now - createdAt) / 86400);
	let recencyBoost = 1.0;
	let finalScore = cosSim;

	if (category === "TEMPORARY") {
		recencyBoost = Math.exp(-0.25 * ageInDays);
		finalScore = 0.7 * cosSim + 0.3 * recencyBoost;
	} else if (category === "DYNAMIC") {
		recencyBoost = Math.exp(-0.05 * ageInDays);
		finalScore = 0.85 * cosSim + 0.15 * recencyBoost;
	} else {
		recencyBoost = Math.exp(-0.01 * ageInDays);
		finalScore = Math.max(cosSim, 0.95 * cosSim + 0.05 * recencyBoost);
	}

	return { ageInDays, recencyBoost, finalScore };
}

interface MemoryDiagnosticItem {
	id: number;
	text: string;
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY";
	createdAt: number;
	userId?: number | null;
	ageInDays: number;
	cosSim: number;
	recencyBoost: number;
	finalScore: number;
	ftsRank?: number;
	rrfScore?: number;
	passedThreshold: boolean;
	selected: boolean;
}

function createDefaultDiagnosticItem(m: {
	id: number;
	text: string;
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY";
	createdAt: number;
	userId?: number | null;
}): MemoryDiagnosticItem {
	return {
		id: m.id,
		text: m.text,
		category: m.category,
		createdAt: m.createdAt,
		userId: m.userId,
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

export interface QueryMemoriesOptions {
	activeTopic?: string;
	history?: MessageRow[];
	senderUserId?: number;
	isPrivateChat?: boolean;
	topK?: number;
	threshold?: number;
}

function resolveChatMemories(
	chatId: string,
	options?: QueryMemoriesOptions,
): MemoryItem[] {
	let allMemories = Repository.getMemories(chatId);

	if (options?.isPrivateChat && options?.senderUserId) {
		const existingIds = new Set(allMemories.map((m) => m.id));
		const userAllMems = Repository.getUserAllMemories(options.senderUserId);
		for (const uMem of userAllMems) {
			if (!existingIds.has(uMem.id)) {
				const fullMem = Repository.getMemoryById(uMem.id);
				if (fullMem) {
					allMemories = [
						...allMemories,
						{
							id: fullMem.id,
							text: fullMem.memory_text,
							embedding: new Float32Array(0),
							createdAt: fullMem.created_at,
							userId: fullMem.user_id,
							category:
								(fullMem.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") ||
								"PROFILE",
							expiresAt: fullMem.expires_at,
						},
					];
				}
			}
		}
	}
	return allMemories;
}

function computeDenseAndSparseCandidates(
	allMemories: MemoryItem[],
	normQuery: Float32Array | null,
	ftsRankMap: Map<number, number>,
	now: number,
): MemoryDiagnosticItem[] {
	return allMemories.map((m) => {
		if (!m.embedding || m.embedding.length === 0 || !normQuery) {
			const item = createDefaultDiagnosticItem(m);
			if (ftsRankMap.has(m.id)) {
				item.ftsRank = ftsRankMap.get(m.id);
			}
			return item;
		}

		const targetEmb = m.normalizedEmbedding || normalizeVector(m.embedding);
		const cosSim = dotProduct(normQuery, targetEmb);
		const { ageInDays, recencyBoost, finalScore } = computeHybridScore(
			cosSim,
			m.createdAt,
			m.category,
			now,
		);

		return {
			id: m.id,
			text: m.text,
			category: m.category,
			createdAt: m.createdAt,
			userId: m.userId,
			ageInDays: Math.round(ageInDays * 100) / 100,
			cosSim: Math.round(cosSim * 10000) / 10000,
			recencyBoost: Math.round(recencyBoost * 10000) / 10000,
			finalScore: Math.round(finalScore * 10000) / 10000,
			ftsRank: ftsRankMap.get(m.id),
			passedThreshold: false,
			selected: false,
		};
	});
}

function fuseRRFAndCheckThresholds(
	candidateDetails: MemoryDiagnosticItem[],
	threshold: number,
): MemoryDiagnosticItem[] {
	const sortedByDense = [...candidateDetails].sort(
		(a, b) => b.finalScore - a.finalScore,
	);
	const denseRankMap = new Map<number, number>();
	sortedByDense.forEach((item, idx) => {
		if (item.finalScore >= 0) {
			denseRankMap.set(item.id, idx + 1);
		}
	});

	const RRF_K = 60;
	const details = candidateDetails.map((item) => {
		const rankDense = denseRankMap.get(item.id);
		const rankSparse = item.ftsRank;

		let rrfScore = 0;
		if (rankDense) {
			rrfScore += 0.7 / (RRF_K + rankDense);
		}
		if (rankSparse) {
			rrfScore += 0.3 / (RRF_K + rankSparse);
		}

		const passedDense = item.finalScore >= threshold;
		const passedSparse =
			Boolean(rankSparse) &&
			(item.finalScore >= threshold - 0.15 || item.cosSim >= 0.4);

		return {
			...item,
			rrfScore: Math.round(rrfScore * 100000) / 100000,
			passedThreshold: passedDense || passedSparse,
		};
	});

	details.sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0));
	return details;
}

function selectPersonalMemories(
	details: MemoryDiagnosticItem[],
	senderUserId: number,
	topK: number,
	selectedIds: Set<number>,
	retrieved: string[],
): void {
	const personalItems = details.filter(
		(d) =>
			d.userId === senderUserId &&
			(d.category === "PROFILE" || d.category === "DYNAMIC") &&
			d.passedThreshold,
	);

	for (const pItem of personalItems.slice(0, 2)) {
		if (retrieved.length < topK) {
			pItem.selected = true;
			selectedIds.add(pItem.id);
			retrieved.push(pItem.text);
		}
	}
}

function selectBiLevelCandidates(
	details: MemoryDiagnosticItem[],
	senderUserId?: number,
	topK = 5,
): { retrievedMemories: string[]; matchedCount: number } {
	const retrievedMemories: string[] = [];
	const selectedIds = new Set<number>();
	let matchedCount = 0;

	for (const item of details) {
		if (item.passedThreshold) {
			matchedCount++;
		}
	}

	if (typeof senderUserId === "number" && senderUserId > 0) {
		selectPersonalMemories(
			details,
			senderUserId,
			topK,
			selectedIds,
			retrievedMemories,
		);
	}

	for (const item of details) {
		if (retrievedMemories.length >= topK) break;
		if (item.passedThreshold && !selectedIds.has(item.id)) {
			item.selected = true;
			selectedIds.add(item.id);
			retrievedMemories.push(item.text);
		}
	}

	return { retrievedMemories, matchedCount };
}

export async function queryMemoriesWithDiagnostics(
	chatId: string,
	query: string,
	options?: QueryMemoriesOptions,
): Promise<MemoryQueryDiagnostics> {
	Repository.pruneExpiredMemories(chatId);

	const allMemories = resolveChatMemories(chatId, options);
	const cleanQuery = query.trim();
	const enrichedQuery = expandContextualQuery(
		cleanQuery,
		options?.history,
		options?.activeTopic,
	);

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
			`[Memory RAG] Query embedding failed for chat ${chatId}. Falling back to FTS retrieval.`,
		);
	}

	const normQuery =
		queryEmbedding.length > 0 ? normalizeVector(queryEmbedding) : null;
	const now = Math.floor(Date.now() / 1000);

	const ftsResults = Repository.searchMemoriesFTS(chatId, cleanQuery, 25);
	const ftsRankMap = new Map<number, number>();
	ftsResults.forEach((res, idx) => {
		ftsRankMap.set(res.id, idx + 1);
	});

	const candidateDetails = computeDenseAndSparseCandidates(
		allMemories,
		normQuery,
		ftsRankMap,
		now,
	);
	const details = fuseRRFAndCheckThresholds(candidateDetails, threshold);
	const { retrievedMemories, matchedCount } = selectBiLevelCandidates(
		details,
		options?.senderUserId,
		topK,
	);

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
	activeTopicOrOptions?: string | QueryMemoriesOptions,
	topK = 5,
): Promise<string[]> {
	const cleanQuery = query.trim();
	if (!cleanQuery) return [];

	const options: QueryMemoriesOptions =
		typeof activeTopicOrOptions === "string"
			? { activeTopic: activeTopicOrOptions, topK }
			: { topK, ...activeTopicOrOptions };

	const diagnostics = await queryMemoriesWithDiagnostics(
		chatId,
		cleanQuery,
		options,
	);

	if (diagnostics.retrievedMemories.length > 0) {
		logger.debug(
			`[Memory RAG] Retrieved ${diagnostics.retrievedMemories.length} memories for query: "${diagnostics.enrichedQuery}"`,
		);
		logger.debug(`[Memory RAG] Memories:`, diagnostics.retrievedMemories);
	}

	return diagnostics.retrievedMemories;
}

async function consolidateMemories(chatIdStr: string) {
	const allMemories = Repository.getMemories(chatIdStr);
	if (allMemories.length < 10) return;

	logger.info(
		`[Memory Consolidation] Triggered for chat ${chatIdStr}. Analyzing ${allMemories.length} memories in chunks...`,
	);

	// Chunk large memory lists to prevent token limit blowout
	const CHUNK_SIZE = 30;
	for (let offset = 0; offset < allMemories.length; offset += CHUNK_SIZE) {
		const chunk = allMemories.slice(offset, offset + CHUNK_SIZE);
		const memoryListText = chunk
			.map((m) => `ID: ${m.id} | ${m.text}`)
			.join("\n");

		const prompt = `Review the following memory list.
Find exact duplicates, resolved contradictions, or completely useless/spam facts.
Return ONLY a JSON array of the integer IDs of memories that should be permanently DELETED. Return an empty array [] if all memories are important and distinct.

Memories:
${memoryListText}`;

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
					`[Memory Consolidation] Successfully deleted ${idsToDelete.length} redundant/spam memories for chat ${chatIdStr} in chunk [${offset}-${offset + chunk.length}].`,
				);
			}
		} catch (error) {
			logger.error(
				`[Memory Consolidation] Error during consolidation for chat ${chatIdStr}:`,
				error,
			);
		}
	}
}
