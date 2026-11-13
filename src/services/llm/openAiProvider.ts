import type OpenAI from "openai";
import { extractFunctionCalls } from "../../agent/functionCalls";
import type { FunctionDeclaration } from "../../agent/types";
import { CONFIG } from "../../config";
import { getOpenAiClient } from "./client";
import { runApiCall } from "./middleware";
import { normalizeSchemaSafely, parseStructuredJson } from "./structuredJson";
import type {
	ChatMessage,
	LlmChatOptions,
	LlmChatResult,
	LlmProvider,
} from "./types";

function convertTools(tools?: FunctionDeclaration[]) {
	if (!tools || tools.length === 0) return undefined;
	return tools.map((t) => ({
		type: "function" as const,
		function: {
			name: t.name,
			description: t.description,
			parameters: normalizeSchemaSafely(t.parameters) as Record<
				string,
				unknown
			>,
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

class OpenAiProvider implements LlmProvider {
	readonly name = "openai" as const;

	async chat(
		messages: ChatMessage[],
		options?: LlmChatOptions,
	): Promise<LlmChatResult> {
		const client = getOpenAiClient();
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

		const completion = await runApiCall(
			() =>
				client.chat.completions.create(params, {
					signal: options?.signal,
				}),
			{
				retries: 3,
				baseDelayMs: 500,
				delayGrowth: "exponential",
				logLabel: "OpenAI",
			},
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
		const client = getOpenAiClient();

		const isArraySchema =
			schema &&
			typeof schema === "object" &&
			(schema.type === "ARRAY" ||
				(schema as { type?: string }).type === "array");

		let schemaDescription = "";
		if (schema && typeof schema === "object") {
			schemaDescription = `\nRequired JSON Schema:\n${JSON.stringify(normalizeSchemaSafely(schema), null, 2)}`;
		}

		const systemPrompt = [
			systemInstruction || "You are an accurate, structured JSON generator.",
			isArraySchema
				? "Output strictly a valid JSON array matching the requested schema. Return ONLY JSON without markdown backticks."
				: "Output strictly valid JSON matching the requested schema. Return ONLY JSON without markdown backticks.",
			schemaDescription,
		]
			.filter(Boolean)
			.join("\n\n");

		const responseFormat:
			| OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"]
			| undefined = isArraySchema ? undefined : { type: "json_object" };

		const completion = await runApiCall(
			() =>
				client.chat.completions.create(
					{
						model: CONFIG.OPENAI_MODEL,
						messages: [
							{ role: "system", content: systemPrompt },
							{ role: "user", content: prompt },
						],
						...(responseFormat && { response_format: responseFormat }),
						max_tokens: 2048,
					},
					{ signal },
				),
			{
				retries: 3,
				baseDelayMs: 500,
				delayGrowth: "exponential",
				logLabel: "OpenAI",
			},
		);

		const rawText = completion.choices[0]?.message?.content?.trim() || "";
		return parseStructuredJson<T>(rawText, Boolean(isArraySchema));
	}
}

export const openAiProvider = new OpenAiProvider();
