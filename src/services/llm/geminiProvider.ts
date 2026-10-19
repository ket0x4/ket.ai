import { CONFIG } from "../../config";
import { ai } from "../gemini/client";
import { getThinkingConfig, runWithRetry } from "../gemini/utils";
import type { LlmProvider } from "./types";

class GeminiProvider implements LlmProvider {
	readonly name = "gemini" as const;

	async generateStructured<T>(
		prompt: string,
		schema: Record<string, unknown>,
		systemInstruction?: string,
		signal?: AbortSignal,
	): Promise<T> {
		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				contents: prompt,
				config: {
					systemInstruction,
					maxOutputTokens: 1024,
					thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL, {
						isAgentic: false,
					}),
					responseMimeType: "application/json",
					// biome-ignore lint/suspicious/noExplicitAny: schema typing
					responseSchema: schema as any,
					abortSignal: signal,
				},
			}),
		);

		const rawText = response.text?.trim() || "";
		const cleaned = rawText.replace(/^```(?:json)?\n?|\n?```$/g, "").trim();
		return JSON.parse(cleaned) as T;
	}
}

export const geminiProvider = new GeminiProvider();
