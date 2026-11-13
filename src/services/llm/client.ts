import OpenAI from "openai";
import { CONFIG } from "../../config";

let client: OpenAI | null = null;
let clientBaseUrl = "";
let clientApiKey = "";

/**
 * Shared OpenAI-compatible API client. Rebuilt when the configured base URL
 * or API key changes so runtime settings updates take effect immediately.
 */
export function getOpenAiClient(): OpenAI {
	const currentBaseUrl = CONFIG.OPENAI_BASE_URL;
	const currentApiKey = CONFIG.OPENAI_API_KEY || "no-key";

	if (
		!client ||
		clientBaseUrl !== currentBaseUrl ||
		clientApiKey !== currentApiKey
	) {
		client = new OpenAI({
			baseURL: currentBaseUrl,
			apiKey: currentApiKey,
		});
		clientBaseUrl = currentBaseUrl;
		clientApiKey = currentApiKey;
	}
	return client;
}
