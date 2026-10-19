import OpenAI from "openai";
import { extractFunctionCalls } from "../../agent/functionCalls";
import type { FunctionDeclaration } from "../../agent/types";
import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type {
	ChatMessage,
	LlmChatOptions,
	LlmChatResult,
	LlmProvider,
} from "./types";

const normalizedSchemaCache = new WeakMap<object, Record<string, unknown>>();

function normalizeSchema(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return schema;
	if (Array.isArray(schema)) return schema.map(normalizeSchema);

	const cached = normalizedSchemaCache.get(schema);
	if (cached) return cached;

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
	normalizedSchemaCache.set(schema, obj);
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

function canMergePlainMessages(
	prev: OpenAI.Chat.Completions.ChatCompletionMessageParam | undefined,
	next: OpenAI.Chat.Completions.ChatCompletionMessageParam,
): boolean {
	if (!prev || prev.role !== next.role) return false;
	if (prev.role === "user" && next.role === "user") {
		return typeof prev.content === "string" && typeof next.content === "string";
	}
	if (prev.role === "assistant" && next.role === "assistant") {
		return (
			!prev.tool_calls?.length &&
			!next.tool_calls?.length &&
			typeof prev.content === "string" &&
			typeof next.content === "string"
		);
	}
	return false;
}

function appendOrMergeMessage(
	out: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
	converted: OpenAI.Chat.Completions.ChatCompletionMessageParam,
): void {
	const hasUserMessage = out.some((m) => m.role === "user");
	if (converted.role === "assistant" && !hasUserMessage) {
		return;
	}

	const prev = out[out.length - 1];
	if (prev && canMergePlainMessages(prev, converted)) {
		prev.content = `${prev.content}\n\n${converted.content}`;
		return;
	}

	out.push(converted);
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
			appendOrMergeMessage(out, converted);
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

function tryExtractArraySlice(cleaned: string): unknown | null {
	const first = cleaned.indexOf("[");
	const last = cleaned.lastIndexOf("]");
	if (first !== -1 && last > first) {
		try {
			return JSON.parse(cleaned.slice(first, last + 1));
		} catch {}
	}
	return null;
}

function tryExtractObjectSlice(cleaned: string): unknown | null {
	const first = cleaned.indexOf("{");
	const last = cleaned.lastIndexOf("}");
	if (first !== -1 && last > first) {
		try {
			return JSON.parse(cleaned.slice(first, last + 1));
		} catch {}
	}
	return null;
}

function extractFirstArrayValue(obj: unknown): unknown | null {
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
	for (const val of Object.values(obj as Record<string, unknown>)) {
		if (Array.isArray(val)) return val;
	}
	return null;
}

function tryRelaxedJsonParse(cleaned: string): unknown | null {
	try {
		const relaxed = cleaned.replace(/,\s*([}\]])/g, "$1");
		return JSON.parse(relaxed);
	} catch {
		return null;
	}
}

function tryExtractDirectJson(
	cleaned: string,
	isArrayExpected: boolean,
): unknown | null {
	try {
		const parsed = JSON.parse(cleaned);
		if (isArrayExpected) {
			const nested = extractFirstArrayValue(parsed);
			if (nested) return nested;
		}
		return parsed;
	} catch {
		return null;
	}
}

function tryExtractObjectOrArraySlice(
	cleaned: string,
	isArrayExpected: boolean,
): unknown | null {
	if (isArrayExpected) {
		const arrSlice = tryExtractArraySlice(cleaned);
		if (arrSlice) return arrSlice;
	}
	const objSlice = tryExtractObjectSlice(cleaned);
	if (objSlice) {
		if (isArrayExpected) {
			const nested = extractFirstArrayValue(objSlice);
			if (nested) return nested;
		}
		return objSlice;
	}
	return null;
}

function parseStructuredJson<T>(rawText: string, isArrayExpected = false): T {
	if (!rawText) return (isArrayExpected ? [] : {}) as T;

	const cleaned = rawText
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();

	const direct = tryExtractDirectJson(cleaned, isArrayExpected);
	if (direct !== null) return direct as T;

	const sliced = tryExtractObjectOrArraySlice(cleaned, isArrayExpected);
	if (sliced !== null) return sliced as T;

	const relaxed = tryRelaxedJsonParse(cleaned);
	if (relaxed !== null) return relaxed as T;

	logger.warn(
		`[OpenAI] Failed to parse structured JSON from text: "${rawText.slice(0, 200)}"`,
	);
	return (isArrayExpected ? [] : {}) as T;
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

		// Safe token limit for local models / OpenAI provider to prevent context OOM / 400 errors
		const safeMaxTokens = Math.min(
			options?.maxTokens && options.maxTokens > 0 ? options.maxTokens : 2048,
			4096,
		);

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
			{
				model: CONFIG.OPENAI_MODEL,
				messages: openAiMessages,
				max_tokens: safeMaxTokens,
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
		const toolCalls = extractFunctionCalls({ choices: completion.choices });
		return { text, toolCalls, choices: completion.choices };
	}

	async generateStructured<T>(
		prompt: string,
		schema?: Record<string, unknown>,
		systemInstruction?: string,
		signal?: AbortSignal,
	): Promise<T> {
		const client = this.getClient();
		const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

		let schemaDescription = "";
		if (schema && typeof schema === "object") {
			try {
				schemaDescription = `\nRequired JSON Schema:\n${JSON.stringify(normalizeSchema(schema), null, 2)}`;
			} catch {
				schemaDescription = "";
			}
		}

		const isArraySchema =
			schema &&
			typeof schema === "object" &&
			(schema.type === "ARRAY" ||
				(schema as { type?: string }).type === "array");

		const systemPrompt = [
			systemInstruction || "You are an accurate, structured JSON generator.",
			isArraySchema
				? "Output strictly a valid JSON array matching the requested schema. Return ONLY JSON without markdown backticks."
				: "Output strictly valid JSON matching the requested schema. Return ONLY JSON without markdown backticks.",
			schemaDescription,
		]
			.filter(Boolean)
			.join("\n\n");

		messages.push({
			role: "system",
			content: systemPrompt,
		});

		messages.push({ role: "user", content: prompt });

		const responseFormat:
			| OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"]
			| undefined = isArraySchema ? undefined : { type: "json_object" };

		const completion = await runWithRetry(() =>
			client.chat.completions.create(
				{
					model: CONFIG.OPENAI_MODEL,
					messages,
					...(responseFormat && { response_format: responseFormat }),
					max_tokens: 2048,
				},
				{ signal },
			),
		);

		const rawText = completion.choices[0]?.message?.content?.trim() || "";
		return parseStructuredJson<T>(rawText, Boolean(isArraySchema));
	}
}

export const openAiProvider = new OpenAiProvider();
