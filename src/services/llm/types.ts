import type { AgentEventHandler } from "../../agent/events";
import type { RawFunctionCall } from "../../agent/functionCalls";
import type { FunctionDeclaration } from "../../agent/types";
import type { MessageRow } from "../../db/repository";
import type { PreparedDocumentContext } from "../gemini/documentPerception";

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
	/**
	 * Enables the provider's "reasoning" mode for multi-step agent turns.
	 * Providers that have no such concept ignore this.
	 */
	agenticThinking?: boolean;
}

export interface LlmChatResult {
	text: string;
	toolCalls: RawFunctionCall[];
	/** Raw provider response fragments, kept for finish-reason / block inspection. */
	choices?: unknown[];
	candidates?: unknown[];
	promptFeedback?: { blockReason?: unknown };
}

export interface LlmProvider {
	readonly name: "gemini" | "openai";
	/** Single-turn or agent-step model call with optional tool use. */
	chat(
		messages: ChatMessage[],
		options?: LlmChatOptions,
	): Promise<LlmChatResult>;
	generateStructured<T>(
		prompt: string,
		schema: Record<string, unknown>,
		systemInstruction?: string,
		signal?: AbortSignal,
	): Promise<T>;
}

export interface ReplyContextInfo {
	messageId: number;
	senderId?: number;
	senderName: string;
	senderUsername?: string;
	isBot: boolean;
	text: string;
}

export interface TargetMessageInfo {
	messageId: number;
	userId: number;
	userName: string;
	userUsername?: string;
	text: string;
	sentAt: number;
	replyTo?: ReplyContextInfo;
}

export interface GenerateReplyOptions {
	history: MessageRow[];
	topicSummary: string | null;
	isSpontaneous?: boolean;
	chatId?: string;
	media?: { buffer: Buffer; mimeType: string };
	document?: PreparedDocumentContext;
	targetMessage?: TargetMessageInfo;
	onEvent?: AgentEventHandler;
	signal?: AbortSignal;
}

/**
 * Everything the generation pipeline needs to know about the current turn.
 * Built by `LlmService.generateReply` from a `GenerateReplyOptions`.
 */
export interface GenerateResponseOptions {
	chatId?: string;
	isSpontaneous?: boolean;
	instruction?: string;
	personaPrompt?: string;
	media?: { buffer: Buffer; mimeType: string };
	document?: PreparedDocumentContext;
	fallbackEmpty: string;
	fallbackError: string;
	mediaFallbackText: string;
	traceId?: string;
	onEvent?: AgentEventHandler;
	signal?: AbortSignal;
	targetMessage?: TargetMessageInfo;
}
