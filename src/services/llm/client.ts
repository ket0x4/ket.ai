import OpenAI from "openai";
import { CONFIG } from "../../config";

interface ClientSlot {
	client: OpenAI | null;
	baseUrl: string;
	apiKey: string;
}

function createClient(baseUrl: string, apiKey: string): OpenAI {
	return new OpenAI({
		baseURL: baseUrl,
		apiKey: apiKey || "no-key",
		// Retries are owned by the LLM middleware pipeline, not the SDK.
		maxRetries: 0,
	});
}

function getOrCreate(
	slot: ClientSlot,
	baseUrl: string,
	apiKey: string,
): OpenAI {
	if (!slot.client || slot.baseUrl !== baseUrl || slot.apiKey !== apiKey) {
		slot.client = createClient(baseUrl, apiKey);
		slot.baseUrl = baseUrl;
		slot.apiKey = apiKey;
	}
	return slot.client;
}

const llmSlot: ClientSlot = { client: null, baseUrl: "", apiKey: "" };
const embeddingSlot: ClientSlot = { client: null, baseUrl: "", apiKey: "" };

/**
 * Shared OpenAI-compatible client for chat, audio, and web search. Rebuilt when
 * the configured base URL or API key changes so runtime settings updates take
 * effect immediately.
 */
export function getOpenAiClient(): OpenAI {
	return getOrCreate(llmSlot, CONFIG.OPENAI_BASE_URL, CONFIG.OPENAI_API_KEY);
}

/**
 * Embedding client. Uses the dedicated embedding endpoint/key when configured,
 * otherwise falls back to the main LLM endpoint/key.
 */
export function getOpenAiEmbeddingClient(): OpenAI {
	return getOrCreate(
		embeddingSlot,
		CONFIG.OPENAI_EMBEDDING_BASE_URL || CONFIG.OPENAI_BASE_URL,
		CONFIG.OPENAI_EMBEDDING_API_KEY || CONFIG.OPENAI_API_KEY,
	);
}
