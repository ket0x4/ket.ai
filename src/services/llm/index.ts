import { runAgentLoop, toolRegistry } from "../../agent";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { getRelevantMemories, type RetrievedMemory } from "../memory";
import {
	buildConversationalContextSections,
	buildConversationalMessages,
	resolveLastMessageText,
	resolveMediaFallbacks,
	shouldEnableToolsForTurn,
} from "./messages";
import { getSystemInstruction } from "./prompt";
import { parseAndProcessReply } from "./replyParser";
import { ensureTopicSummary, summarizeTopic } from "./topicSummary";
import type { GenerateReplyOptions, GenerateResponseOptions } from "./types";

export type { GeneratedMediaArtifact } from "../../agent/index";
export type {
	GenerateReplyOptions,
	ReplyContextInfo,
	TargetMessageInfo,
} from "./types";

function resolveGenerationFailure(
	error: unknown,
	traceId: string,
	signal: AbortSignal | undefined,
	fallbackError: string,
): string {
	if (signal?.aborted) {
		logger.info(
			`[LLM:${traceId}] Generation aborted (timeout or /stop); suppressing reply.`,
		);
		return "";
	}
	logger.error(`Error in LLM generateResponse [${traceId}]:`, error);
	return fallbackError;
}

function resolveMaxOutputTokens(isAgentic: boolean): number {
	return isAgentic ? 4096 : 2048;
}

async function loadContextMemories(
	chatIdStr: string,
	history: MessageRow[],
	topicSummary: string | null,
	options: GenerateResponseOptions,
	lastMessageText: string,
	targetUserId?: number,
): Promise<RetrievedMemory[]> {
	if (!chatIdStr) return [];
	const queryForMemory = options.isSpontaneous
		? topicSummary || "General chat"
		: lastMessageText;
	return await getRelevantMemories(chatIdStr, queryForMemory, {
		activeTopic: topicSummary || undefined,
		history,
		senderUserId: targetUserId,
	});
}

async function generateResponse(
	history: MessageRow[],
	topicSummary: string | null,
	options: GenerateResponseOptions,
): Promise<string> {
	const traceId =
		options.traceId ||
		`trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
	try {
		if (history.length === 0) {
			logger.warn(
				`[LLM:${traceId}] generateResponse called with empty history. Returning fallback.`,
			);
			return options.fallbackEmpty;
		}
		const chatIdStr = options.chatId || history[0]?.chat_id?.toString() || "";
		const lastMsg = history[history.length - 1];
		const lastMessageText = resolveLastMessageText(
			lastMsg,
			options.mediaFallbackText,
		);

		let personaPrompt = options.personaPrompt;
		if (personaPrompt === undefined && chatIdStr) {
			const activePersona = Repository.getActivePersonaForChat(chatIdStr);
			personaPrompt = activePersona?.prompt;
		}

		const targetUserId =
			options.targetMessage?.userId ??
			(lastMsg && !lastMsg.is_bot_reply ? lastMsg.user_id : undefined);

		const memories = await loadContextMemories(
			chatIdStr,
			history,
			topicSummary,
			options,
			lastMessageText,
			targetUserId,
		);

		const enableTools = shouldEnableToolsForTurn(options);
		const contextSections = buildConversationalContextSections(
			history,
			topicSummary,
			options,
			memories,
			targetUserId,
		);
		const messages = buildConversationalMessages(history, options);

		const declarations = enableTools
			? toolRegistry.getFunctionDeclarations()
			: [];
		const isAgentic = declarations.length > 0;
		const agentConfig = {
			systemInstruction: getSystemInstruction(
				personaPrompt,
				isAgentic ? declarations.map((t) => t.name) : undefined,
				contextSections,
			),
			maxOutputTokens: resolveMaxOutputTokens(isAgentic),
			tools: isAgentic ? declarations : undefined,
		};

		const responseText = await runAgentLoop(messages, agentConfig, {
			chatId: chatIdStr,
			sessionId: chatIdStr,
			traceId,
			onEvent: options.onEvent,
			signal: options.signal,
		});

		return parseAndProcessReply(responseText, traceId);
	} catch (error) {
		return resolveGenerationFailure(
			error,
			traceId,
			options.signal,
			options.fallbackError,
		);
	}
}

export const LlmService = {
	generateReply(options: GenerateReplyOptions): Promise<string> {
		const {
			history,
			topicSummary,
			isSpontaneous = false,
			chatId,
			media,
			document,
			targetMessage,
			onEvent,
			signal,
		} = options;
		const effectiveMedia = media || document?.mediaPayload;
		const fallbacks = resolveMediaFallbacks(document, effectiveMedia);

		return generateResponse(history, topicSummary, {
			chatId,
			isSpontaneous,
			media: effectiveMedia,
			document,
			instruction: fallbacks.instruction,
			fallbackEmpty: fallbacks.fallbackEmpty,
			fallbackError: fallbacks.fallbackError,
			mediaFallbackText: fallbacks.mediaFallbackText,
			onEvent,
			signal,
			targetMessage,
		});
	},

	ensureTopicSummary,

	summarizeTopic,
};
