import { CONFIG } from "../../config";
import { ai } from "../gemini/client";
import { getThinkingConfig } from "../gemini/thinking";
import { geminiRunWithRetry } from "./retry";
import { parseStructuredJson } from "./structuredJson";
import type {
	ChatMessage,
	LlmChatOptions,
	LlmChatResult,
	LlmProvider,
} from "./types";

type GeminiPart = Record<string, unknown>;
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function parseToolResult(content: string | null | undefined): unknown {
	if (!content) return {};
	try {
		const parsed = JSON.parse(content);
		return parsed && typeof parsed === "object" ? parsed : { result: parsed };
	} catch {
		return { result: content };
	}
}

function toolMessageToParts(msg: ChatMessage): GeminiPart[] {
	const response: Record<string, unknown> = {
		result: parseToolResult(msg.content),
	};
	const functionResponse: Record<string, unknown> = {
		name: msg.toolName || "unknown_tool",
		response,
	};
	if (msg.toolCallId) functionResponse.id = msg.toolCallId;
	return [{ functionResponse }];
}

function assistantMessageToParts(msg: ChatMessage): GeminiPart[] {
	const parts: GeminiPart[] = [];
	if (msg.content) parts.push({ text: msg.content });
	for (const fc of msg.toolCalls ?? []) {
		const functionCall: Record<string, unknown> = {
			name: fc.name,
			args: fc.args || {},
		};
		if (fc.id) functionCall.id = fc.id;
		parts.push({ functionCall });
	}
	return parts;
}

function textOrMediaMessageToParts(msg: ChatMessage): GeminiPart[] {
	const parts: GeminiPart[] = [];
	if (msg.content) parts.push({ text: msg.content });
	if (msg.media) {
		parts.push({
			inlineData: {
				mimeType: msg.media.mimeType,
				data: msg.media.buffer.toString("base64"),
			},
		});
	}
	return parts;
}

function chatMessageToParts(msg: ChatMessage): GeminiPart[] {
	switch (msg.role) {
		case "tool":
			return toolMessageToParts(msg);
		case "assistant":
			return assistantMessageToParts(msg);
		default:
			return textOrMediaMessageToParts(msg);
	}
}

/**
 * Converts the provider-agnostic ChatMessage[] pipeline format into Gemini
 * `contents`. Consecutive same-role messages are merged into single content
 * entries, as the Gemini API expects alternating turns.
 */
function convertChatMessagesToContents(
	messages: ChatMessage[],
): GeminiContent[] {
	const contents: GeminiContent[] = [];
	for (const msg of messages) {
		if (msg.role === "system") continue;
		const role = msg.role === "assistant" ? "model" : "user";
		const parts = chatMessageToParts(msg);
		if (parts.length === 0) continue;

		const prev = contents[contents.length - 1];
		if (prev && prev.role === role) {
			prev.parts.push(...parts);
		} else {
			contents.push({ role, parts });
		}
	}
	return contents;
}

class GeminiProvider implements LlmProvider {
	readonly name = "gemini" as const;

	async chat(
		messages: ChatMessage[],
		options?: LlmChatOptions,
	): Promise<LlmChatResult> {
		const tools =
			options?.tools && options.tools.length > 0
				? [{ functionDeclarations: options.tools }]
				: undefined;
		const isAgentic = options?.agenticThinking ?? Boolean(tools);

		const response = await geminiRunWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
				contents: convertChatMessagesToContents(messages) as any,
				config: {
					systemInstruction: options?.systemInstruction,
					maxOutputTokens:
						options?.maxTokens && options.maxTokens > 0
							? options.maxTokens
							: undefined,
					thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL, {
						isAgentic,
					}),
					...(tools ? { tools } : {}),
					responseMimeType:
						!tools && options?.responseFormat === "json"
							? "application/json"
							: undefined,
					abortSignal: options?.signal,
					// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
				} as any,
			}),
		);

		return {
			text: response.text?.trim() || "",
			toolCalls: [],
			candidates: Array.isArray(response.candidates)
				? response.candidates
				: undefined,
			promptFeedback: response.promptFeedback as
				| { blockReason?: unknown }
				| undefined,
		};
	}

	async generateStructured<T>(
		prompt: string,
		schema: Record<string, unknown>,
		systemInstruction?: string,
		signal?: AbortSignal,
	): Promise<T> {
		const response = await geminiRunWithRetry(() =>
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
		return parseStructuredJson<T>(rawText);
	}
}

export const geminiProvider = new GeminiProvider();
