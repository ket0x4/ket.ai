import {
	type MemoryCategory,
	type MemoryItem,
	type MessageRow,
	Repository,
} from "../../db/repository";
import logger from "../../utils/logger";
import { dotProduct, normalizeVector } from "../../utils/vector";
import {
	DEFAULT_SIMILARITY_THRESHOLD,
	DEFAULT_TOP_K,
	FTS_SCORE_BOOST,
	PERSONAL_MEMORY_LIMIT,
} from "./constants";
import { generateEmbedding } from "./embedding";
import { expandContextualQuery } from "./queryExpansion";

export interface RetrievedMemory {
	text: string;
	userId?: number | null;
}

interface QueryMemoriesOptions {
	activeTopic?: string;
	history?: MessageRow[];
	senderUserId?: number;
	topK?: number;
	threshold?: number;
}

interface ScoredMemory {
	id: number;
	text: string;
	category: MemoryCategory;
	userId: number | null;
	cosSim: number;
	score: number;
	rankScore: number;
	ftsRank?: number;
	passedThreshold: boolean;
}

function resolveChatMemories(
	chatId: string,
	senderUserId?: number,
): MemoryItem[] {
	const allMemories = [...Repository.getMemories(chatId)];

	if (senderUserId) {
		const existingIds = new Set(allMemories.map((memory) => memory.id));
		for (const personal of Repository.getUserAllMemories(senderUserId)) {
			if (!existingIds.has(personal.id)) {
				existingIds.add(personal.id);
				allMemories.push(personal);
			}
		}
	}

	return allMemories.filter(
		(memory) => !memory.userId || !Repository.isUserOptedOut(memory.userId),
	);
}

function hybridScore(
	cosSim: number,
	createdAt: number,
	category: MemoryCategory,
	now: number,
): number {
	const ageInDays = Math.max(0, (now - createdAt) / 86400);

	if (category === "TEMPORARY") {
		return 0.7 * cosSim + 0.3 * Math.exp(-0.25 * ageInDays);
	}
	if (category === "DYNAMIC") {
		return 0.85 * cosSim + 0.15 * Math.exp(-0.05 * ageInDays);
	}
	return Math.max(cosSim, 0.95 * cosSim + 0.05 * Math.exp(-0.01 * ageInDays));
}

function scoreCandidates(
	memories: MemoryItem[],
	normQuery: Float32Array | null,
	ftsRankMap: Map<number, number>,
	threshold: number,
	now: number,
): ScoredMemory[] {
	return memories
		.map((memory): ScoredMemory => {
			const ftsRank = ftsRankMap.get(memory.id);

			if (!normQuery || memory.embedding.length === 0) {
				return {
					id: memory.id,
					text: memory.text,
					category: memory.category,
					userId: memory.userId,
					cosSim: 0,
					score: -1,
					rankScore: -1 + (ftsRank !== undefined ? FTS_SCORE_BOOST : 0),
					ftsRank,
					passedThreshold: false,
				};
			}

			// Stored embeddings are normalized before insertion.
			const cosSim = dotProduct(normQuery, memory.embedding);
			const score = hybridScore(cosSim, memory.createdAt, memory.category, now);
			const passedDense = score >= threshold;
			const passedSparse =
				ftsRank !== undefined && (score >= threshold - 0.15 || cosSim >= 0.4);

			return {
				id: memory.id,
				text: memory.text,
				category: memory.category,
				userId: memory.userId,
				cosSim,
				score,
				rankScore: score + (ftsRank !== undefined ? FTS_SCORE_BOOST : 0),
				ftsRank,
				passedThreshold: passedDense || passedSparse,
			};
		})
		.sort((a, b) => b.rankScore - a.rankScore);
}

function selectCandidates(
	scored: ScoredMemory[],
	senderUserId: number | undefined,
	topK: number,
): RetrievedMemory[] {
	const selectedIds = new Set<number>();
	const retrieved: RetrievedMemory[] = [];

	const add = (memory: ScoredMemory) => {
		if (retrieved.length >= topK || selectedIds.has(memory.id)) return;
		selectedIds.add(memory.id);
		retrieved.push({ text: memory.text, userId: memory.userId });
	};

	if (typeof senderUserId === "number" && senderUserId > 0) {
		const personal = scored.filter(
			(memory) =>
				memory.userId === senderUserId &&
				(memory.category === "PROFILE" ||
					(memory.category === "DYNAMIC" && memory.passedThreshold)),
		);
		for (const memory of personal.slice(0, PERSONAL_MEMORY_LIMIT)) {
			add(memory);
		}
	}

	for (const memory of scored) {
		if (retrieved.length >= topK) break;
		if (memory.passedThreshold) add(memory);
	}

	return retrieved;
}

async function queryMemories(
	chatId: string,
	query: string,
	options: QueryMemoriesOptions,
): Promise<RetrievedMemory[]> {
	Repository.pruneExpiredMemories(chatId);

	const cleanQuery = query.trim();
	if (!cleanQuery) return [];

	const memories = resolveChatMemories(chatId, options.senderUserId);
	if (memories.length === 0) return [];

	const enrichedQuery = expandContextualQuery(
		cleanQuery,
		options.history,
		options.activeTopic,
	);
	const queryEmbedding = await generateEmbedding(enrichedQuery);
	if (queryEmbedding.length === 0) {
		logger.warn(
			`[Memory RAG] Query embedding failed for chat ${chatId}. Falling back to FTS retrieval.`,
		);
	}

	const normQuery =
		queryEmbedding.length > 0 ? normalizeVector(queryEmbedding) : null;
	const threshold = options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
	const topK = options.topK ?? DEFAULT_TOP_K;
	const now = Math.floor(Date.now() / 1000);

	const ftsResults = Repository.searchMemoriesFTS(chatId, cleanQuery, 25);
	const ftsRankMap = new Map<number, number>();
	ftsResults.forEach((result, index) => {
		ftsRankMap.set(result.id, index + 1);
	});

	const scored = scoreCandidates(
		memories,
		normQuery,
		ftsRankMap,
		threshold,
		now,
	);

	return selectCandidates(scored, options.senderUserId, topK);
}

export async function getRelevantMemories(
	chatId: string,
	query: string,
	options: QueryMemoriesOptions = {},
): Promise<RetrievedMemory[]> {
	const cleanQuery = query.trim();
	if (!cleanQuery) return [];

	const memories = await queryMemories(chatId, cleanQuery, options);
	if (memories.length > 0) {
		logger.debug(
			`[Memory RAG] Retrieved ${memories.length} memories for query: "${cleanQuery}"`,
		);
		logger.debug("[Memory RAG] Memories:", memories);
	}
	return memories;
}
