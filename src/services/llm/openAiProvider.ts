import OpenAI from "openai";
import type { RawFunctionCall } from "../../agent/functionCalls";
import type { FunctionDeclaration } from "../../agent/types";
import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type {
	ChatMessage,
	LlmChatOptions,
	LlmChatResult,
	LlmProvider,
} from "./types";

function normalizeSchema(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return schema;
	if (Array.isArray(schema)) return schema.map(normalizeSchema);

	const obj = { ...(schema as Record<string, unknown>) };
	if (typeof obj.type === "string") {
		obj.type = obj.type.toLowerCase();
	}
	if (obj.properties && typeof obj.properties === "object") {
		const props: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(
			obj.properties as Record<string, unknown>,
		)) {
			props[key] = normalizeSchema(val);
		}
		obj.properties = props;
	}
	if (obj.items) {
		obj.items = normalizeSchema(obj.items);
	}
	return obj;
}

function convertTools(tools?: FunctionDeclaration[]) {
	if (!tools || tools.length === 0) return undefined;
	return tools.map((t) => ({
		type: "function" as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: normalizeSchema(t.parameters) as Record<string, unknown>,
		},
	}));
}

function convertOpenAiUserMessage(
	msg: ChatMessage,
): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
	if (msg.media) {
		return {
			role: "user",
			content: [
				{ type: "text", text: msg.content || "" },
				{
					type: "image_url",
					image_url: {
						url: `data:${msg.media.mimeType};base64,${msg.media.buffer.toString("base64")}`,
					},
				},
			],
		};
	}
	return { role: "user", content: msg.content || "" };
}

function convertOpenAiAssistantMessage(
	msg: ChatMessage,
): OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam {
	const assistantMsg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam =
		{
			role: "assistant",
			content: msg.content ?? null,
		};
	if (msg.toolCalls && msg.toolCalls.length > 0) {
		assistantMsg.tool_calls = msg.toolCalls.map((fc, idx) => ({
			id: fc.id || `call_${idx}_${Date.now()}`,
			type: "function",
			function: {
				name: fc.name,
				arguments: JSON.stringify(fc.args || {}),
			},
		}));
	}
	return assistantMsg;
}

function convertSingleMessage(
	msg: ChatMessage,
	hasSystemInstruction: boolean,
): OpenAI.Chat.Completions.ChatCompletionMessageParam | null {
	switch (msg.role) {
		case "system":
			return hasSystemInstruction
				? null
				: { role: "system", content: msg.content || "" };
		case "user":
			return convertOpenAiUserMessage(msg);
		case "assistant":
			return convertOpenAiAssistantMessage(msg);
		case "tool":
			return {
				role: "tool",
				tool_call_id: msg.toolCallId || "call_default",
				content: msg.content || "",
			};
	}
}

function convertMessages(
	messages: ChatMessage[],
	systemInstruction?: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
	const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

	if (systemInstruction) {
		out.push({ role: "system", content: systemInstruction });
	}

	const hasSystem = Boolean(systemInstruction);
	for (const msg of messages) {
		const converted = convertSingleMessage(msg, hasSystem);
		if (converted) {
			out.push(converted);
		}
	}

	return out;
}

function isTransientError(error: unknown): boolean {
	const err = error as { status?: number; code?: string; message?: string };
	const status = err?.status;
	const code = err?.code;
	const message = err?.message || String(error);

	if (status === 429 || (status !== undefined && status >= 500)) return true;
	if (
		code === "ECONNRESET" ||
		code === "ETIMEDOUT" ||
		code === "ECONNREFUSED" ||
		code === "EPIPE"
	)
		return true;
	if (
		message.includes("429") ||
		message.includes("503") ||
		message.includes("connection error") ||
		message.includes("fetch failed") ||
		message.includes("network timeout")
	) {
		return true;
	}
	return false;
}

async function runWithRetry<T>(
	fn: () => Promise<T>,
	retries = 3,
	baseDelayMs = 500,
): Promise<T> {
	let currentDelay = baseDelayMs;
	let lastError: unknown;

	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (isTransientError(error) && i < retries - 1) {
				logger.warn(
					`[OpenAI] Transient error (attempt ${i + 1}/${retries}). Retrying in ${currentDelay}ms:`,
					error instanceof Error ? error.message : error,
				);
				await new Promise((resolve) => setTimeout(resolve, currentDelay));
				currentDelay *= 2;
			} else {
				throw error;
			}
		}
	}
	throw lastError;
}

function extractOpenAiToolCalls(
	choice?: OpenAI.Chat.Completions.ChatCompletion.Choice,
): RawFunctionCall[] {
	if (!choice?.message?.tool_calls) return [];
	const toolCalls: RawFunctionCall[] = [];
	for (const tc of choice.message.tool_calls) {
		if (tc.type === "function") {
			let parsedArgs: Record<string, unknown> = {};
			try {
				parsedArgs = tc.function.arguments
					? JSON.parse(tc.function.arguments)
					: {};
			} catch {
				parsedArgs = { raw: tc.function.arguments };
			}
			toolCalls.push({
				id: tc.id,
				name: tc.function.name,
				args: parsedArgs,
			});
		}
	}
	return toolCalls;
}

class OpenAiProvider implements LlmProvider {
	readonly name = "openai" as const;
	private client: OpenAI | null = null;
	private clientBaseUrl = "";
	private clientApiKey = "";

	private getClient(): OpenAI {
		const currentBaseUrl = CONFIG.OPENAI_BASE_URL;
		const currentApiKey = CONFIG.OPENAI_API_KEY || "no-key";

		if (
			!this.client ||
			this.clientBaseUrl !== currentBaseUrl ||
			this.clientApiKey !== currentApiKey
		) {
			this.client = new OpenAI({
				baseURL: currentBaseUrl,
				apiKey: currentApiKey,
			});
			this.clientBaseUrl = currentBaseUrl;
			this.clientApiKey = currentApiKey;
		}
		return this.client;
	}

	async chat(
		messages: ChatMessage[],
		options?: LlmChatOptions,
	): Promise<LlmChatResult> {
		const client = this.getClient();
		const openAiMessages = convertMessages(
			messages,
			options?.systemInstruction,
		);
		const tools = convertTools(options?.tools);

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
			{
				model: CONFIG.OPENAI_MODEL,
				messages: openAiMessages,
				max_tokens: options?.maxTokens || 2048,
			};

		if (tools) {
			params.tools = tools;
			params.tool_choice = "auto";
		}

		if (!tools && options?.responseFormat === "json") {
			params.response_format = { type: "json_object" };
		}

		const completion = await runWithRetry(() =>
			client.chat.completions.create(params, {
				signal: options?.signal,
			}),
		);

		const choice = completion.choices[0];
		const text = choice?.message?.content?.trim() || "";
		const toolCalls = extractOpenAiToolCalls(choice);
		return { text, toolCalls, choices: completion.choices };
	}

	async generateStructured<T>(
		prompt: string,
		_schema: Record<string, unknown>,
		systemInstruction?: string,
		signal?: AbortSignal,
	): Promise<T> {
		const client = this.getClient();
		const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

		if (systemInstruction) {
			messages.push({
				role: "system",
				content: `${systemInstruction}\nOutput strictly valid JSON.`,
			});
		} else {
			messages.push({
				role: "system",
				content: "Output strictly valid JSON.",
			});
		}

		messages.push({ role: "user", content: prompt });

		const completion = await runWithRetry(() =>
			client.chat.completions.create(
				{
					model: CONFIG.OPENAI_MODEL,
					messages,
					response_format: { type: "json_object" },
					max_tokens: 2048,
				},
				{ signal },
			),
		);

		const rawText = completion.choices[0]?.message?.content?.trim() || "{}";
		const cleaned = rawText.replace(/^```(?:json)?\n?|\n?```$/g, "").trim();
		return JSON.parse(cleaned) as T;
	}
}

export const openAiProvider = new OpenAiProvider();
