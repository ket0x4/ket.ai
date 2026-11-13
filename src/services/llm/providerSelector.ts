import { CONFIG } from "../../config";
import { geminiProvider } from "./geminiProvider";
import { openAiProvider } from "./openAiProvider";
import type { LlmProvider } from "./types";

/**
 * Selects the active LLM provider. Kept in its own module so low-level
 * consumers (agent loop, memory worker) can use it without importing the
 * LlmService facade and creating an import cycle.
 */
export function getLlmProvider(): LlmProvider {
	return CONFIG.LLM_PROVIDER === "openai" ? openAiProvider : geminiProvider;
}
