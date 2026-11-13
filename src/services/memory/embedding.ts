import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import { getOpenAiEmbeddingClient } from "../llm/client";
import { rateLimiters, runApiCall } from "../llm/middleware";
import { EMBEDDING_CACHE_SIZE } from "./constants";

const queryEmbeddingCache = new Map<string, number[]>();

export async function generateEmbedding(text: string): Promise<number[]> {
	try {
		const trimmed = text.trim();
		const cacheKey = trimmed.toLowerCase();
		const cached = queryEmbeddingCache.get(cacheKey);
		if (cached) return cached;

		const response = await runApiCall(
			() =>
				getOpenAiEmbeddingClient().embeddings.create({
					model: CONFIG.OPENAI_EMBEDDING_MODEL,
					input: trimmed,
				}),
			{
				limiter: rateLimiters.embedding,
				baseDelayMs: 1000,
				logLabel: "OpenAI:embedding",
			},
		);

		const values = response.data?.[0]?.embedding || [];
		if (values.length > 0) {
			if (queryEmbeddingCache.size >= EMBEDDING_CACHE_SIZE) {
				const oldest = queryEmbeddingCache.keys().next().value;
				if (oldest) queryEmbeddingCache.delete(oldest);
			}
			queryEmbeddingCache.set(cacheKey, values);
		}
		return values;
	} catch (error) {
		logger.error("Error generating embedding:", error);
		return [];
	}
}
