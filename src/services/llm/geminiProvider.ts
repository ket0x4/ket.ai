import { extractFunctionCalls } from "../../agent/functionCalls";
import { CONFIG } from "../../config";
import { ai } from "../gemini/client";
import { getThinkingConfig, runWithRetry } from "../gemini/utils";
import type {
	ChatMessage,
	LlmChatOptions,
	LlmChatResult,
	LlmProvider,
} from "./types";

function convertUserMessage(msg: ChatMessage) {
	const parts: Array<Record<string, unknown>> = [];
	if (msg.media) {
		parts.push({
			inlineData: {
				mimeType: msg.media.mimeType,
				data: msg.media.buffer.toString("base64"),
			},
		});
	}
	if (msg.content) {
		parts.push({ text: msg.content });
	}
	return { role: "user" as const, parts };
}

function convertAssistantMessage(msg: ChatMessage) {
	const parts: Array<Record<string, unknown>> = [];
	if (msg.content) {
		parts.push({ text: msg.content });
	}
	if (msg.toolCalls) {
		for (const fc of msg.toolCalls) {
			const callObj: Record<string, unknown> = {
				name: fc.name,
				args: fc.args || {},
			};
			if (fc.id) callObj.id = fc.id;
			parts.push({ functionCall: callObj });
		}
	}
	return { role: "model" as const, parts };
}

function convertToolMessage(msg: ChatMessage) {
	let parsedResult: unknown;
	try {
		parsedResult = msg.content ? JSON.parse(msg.content) : {};
	} catch {
		parsedResult = { raw: msg.content };
	}
	const functionResponseObj: Record<string, unknown> = {
		name: msg.toolName || "tool",
		response: { result: parsedResult },
	};
	if (msg.toolCallId) {
		functionResponseObj.id = msg.toolCallId;
	}
	return {
		role: "user" as const,
		parts: [{ functionResponse: functionResponseObj }],
	};
}

function convertToGeminiContents(messages: ChatMessage[]) {
	const contents: Array<{
		role: "user" | "model";
		parts: Array<Record<string, unknown>>;
	}> = [];

	for (const msg of messages) {
		if (msg.role === "user") {
			contents.push(convertUserMessage(msg));
		} else if (msg.role === "assistant") {
			contents.push(convertAssistantMessage(msg));
		} else if (msg.role === "tool") {
			contents.push(convertToolMessage(msg));
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
		const systemMessage = messages.find((m) => m.role === "system");
		const systemInstruction =
			options?.systemInstruction || systemMessage?.content || undefined;

		const contents = convertToGeminiContents(messages);

		const toolsConfig =
			options?.tools && options.tools.length > 0
				? [{ functionDeclarations: options.tools }]
				: undefined;

		const genConfig: Record<string, unknown> = {
			systemInstruction,
			maxOutputTokens: options?.maxTokens || 2048,
			thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL, {
				isAgentic: options?.isAgentic,
			}),
			tools: toolsConfig,
			abortSignal: options?.signal,
		};

		if (!toolsConfig && options?.responseFormat === "json") {
			genConfig.responseMimeType = "application/json";
			if (options.jsonSchema) {
				genConfig.responseSchema = options.jsonSchema;
			}
		}

		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				// biome-ignore lint/suspicious/noExplicitAny: SDK contents type
				contents: contents as any,
				// biome-ignore lint/suspicious/noExplicitAny: SDK config type
				config: genConfig as any,
			}),
		);

		const text = response.text?.trim() || "";
		const toolCalls = extractFunctionCalls(response);
		return { text, toolCalls, candidates: response.candidates };
	}

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
					maxOutputTokens: 2048,
					thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
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
