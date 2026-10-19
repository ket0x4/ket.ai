import type { RawFunctionCall } from "../../agent/functionCalls";
import type { FunctionDeclaration } from "../../agent/types";

export interface ChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content?: string | null;
	toolCalls?: RawFunctionCall[];
	toolCallId?: string;
	toolName?: string;
	media?: { buffer: Buffer; mimeType: string };
}

export interface LlmChatOptions {
	tools?: FunctionDeclaration[];
	maxTokens?: number;
	signal?: AbortSignal;
	responseFormat?: "text" | "json";
	jsonSchema?: Record<string, unknown>;
	systemInstruction?: string;
}

export interface LlmChatResult {
	text: string;
	toolCalls: RawFunctionCall[];
	choices?: unknown[];
	candidates?: unknown[];
}

export interface LlmProvider {
	readonly name: "gemini" | "openai";
	generateStructured<T>(
		prompt: string,
		schema: Record<string, unknown>,
		systemInstruction?: string,
		signal?: AbortSignal,
	): Promise<T>;
}
