import {
	type AgentEventHandler,
	runAgentLoop,
	toolRegistry,
} from "../../agent/index";
import { CONFIG } from "../../config";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { botUsername } from "../bot/instance";
import type { PreparedDocumentContext } from "../gemini/documentPerception";
import { getRelevantMemories, type RetrievedMemory } from "../gemini/memory";
import {
	cleanUserText,
	getSystemInstruction,
	resolveMessageFallback,
	stripEmoji,
} from "../gemini/utils";
import { geminiProvider } from "./geminiProvider";
import { openAiProvider } from "./openAiProvider";
import type { ChatMessage, LlmProvider } from "./types";

export type { GeneratedMediaArtifact } from "../../agent/index";

export function getLlmProvider(): LlmProvider {
	return CONFIG.LLM_PROVIDER === "openai" ? openAiProvider : geminiProvider;
}

const lastSummarizedCount = new Map<string, number>();
const MAX_TRACKED_CHATS = 200;
const BOT_SENDER_TAG = "ket.ai (assistant)";

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

interface GenerateResponseOptions {
	chatId?: string;
	isSpontaneous?: boolean;
	instruction?: string;
	personaPrompt?: string;
	media?: { buffer: Buffer; mimeType: string };
	document?: PreparedDocumentContext;
	replyDescription: string;
	fallbackEmpty: string;
	fallbackError: string;
	mediaFallbackText: string;
	traceId?: string;
	onEvent?: AgentEventHandler;
	signal?: AbortSignal;
	targetMessage?: TargetMessageInfo;
}

interface GenerateReplyOptions {
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

function resolveLastMessageText(
	lastMsg: MessageRow | undefined,
	mediaFallback: string,
): string {
	if (!lastMsg) return mediaFallback;
	if (lastMsg.is_bot_reply) return lastMsg.text || mediaFallback;
	return cleanUserText(lastMsg.text, botUsername) || mediaFallback;
}

function extractReplyFieldFromObject(
	parsed: Record<string, unknown>,
): string | undefined {
	const candidateFields = [
		"reply",
		"summary",
		"text",
		"message",
		"answer",
		"result",
		"output",
		"response",
		"content",
	];
	for (const field of candidateFields) {
		const val = parsed[field];
		if (typeof val === "string" && val.trim()) {
			return val.trim();
		}
	}
	return undefined;
}

function handleJsonReply(
	cleanedText: string,
	rawText: string,
	traceId: string,
): string {
	try {
		const parsed = JSON.parse(cleanedText);
		if (parsed && typeof parsed === "object") {
			const extracted = extractReplyFieldFromObject(
				parsed as Record<string, unknown>,
			);
			if (extracted) return extracted;

			if (Object.keys(parsed).length > 0) {
				return cleanedText;
			}
		}
		return "";
	} catch {
		const looseReply = tryExtractReplyFromJsonLoose(cleanedText);
		if (looseReply) return looseReply;

		logger.warn(
			`[LLM:${traceId}] Parse error on model JSON response. Using cleaned plain text. Raw text: "${rawText}"`,
		);
		return cleanedText;
	}
}

function tryExtractReplyFromJsonLoose(text: string): string | null {
	const match = text.match(
		/"(?:reply|text|message|answer|response|content|output|result)"\s*:\s*"([\s\S]*?)"(?:\s*,\s*"|\s*})/i,
	);
	if (match?.[1]) {
		try {
			return JSON.parse(`"${match[1]}"`);
		} catch {
			return match[1]
				.replace(/\\n/g, "\n")
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, "\\")
				.trim();
		}
	}
	return null;
}

function tryExtractJsonString(text: string): string | null {
	const trimmed = text.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return trimmed;
	}
	const jsonFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (jsonFenceMatch) {
		const inner = jsonFenceMatch[1].trim();
		if (inner.startsWith("{") || inner.startsWith("[")) {
			return inner;
		}
	}
	return null;
}

function parseAndProcessReply(responseText: string, traceId: string): string {
	const trimmed = responseText?.trim() || "";
	if (!trimmed) {
		return "";
	}

	if (
		trimmed === "}" ||
		trimmed === "{" ||
		trimmed === "[]" ||
		trimmed === "{}"
	) {
		logger.warn(
			`[LLM:${traceId}] Model returned stray bracket/empty payload: "${trimmed}". Suppressing reply.`,
		);
		return "";
	}

	const jsonStr = tryExtractJsonString(trimmed);
	if (jsonStr) {
		const jsonReply = handleJsonReply(jsonStr, responseText, traceId);
		if (jsonReply) return stripEmoji(jsonReply).trim();
	}

	return stripEmoji(trimmed).trim();
}

function convertChatMessagesToGeminiContents(
	messages: ChatMessage[],
): Array<Record<string, unknown>> {
	const contents: Array<Record<string, unknown>> = [];
	for (const msg of messages) {
		const role = msg.role === "assistant" ? "model" : "user";
		const parts: Array<Record<string, unknown>> = [];
		if (msg.content) {
			parts.push({ text: msg.content });
		}
		if (msg.media) {
			parts.push({
				inlineData: {
					mimeType: msg.media.mimeType,
					data: msg.media.buffer.toString("base64"),
				},
			});
		}
		if (parts.length === 0) continue;

		const prev = contents[contents.length - 1];
		if (prev && prev.role === role && Array.isArray(prev.parts)) {
			prev.parts.push(...parts);
		} else {
			contents.push({ role, parts });
		}
	}
	return contents;
}

function resolveMediaFallbacks(
	document?: PreparedDocumentContext,
	effectiveMedia?: { buffer: Buffer; mimeType: string },
): {
	instruction?: string;
	replyDescription: string;
	fallbackEmpty: string;
	fallbackError: string;
	mediaFallbackText: string;
} {
	if (document) {
		return {
			instruction: `The user is referring to or asking about the document '${document.fileName}'. It is saved in your sandbox workspace. Inspect, run (via execute_code), edit/modify (via write_workspace_file/send_workspace_file), or summarize it according to the user's message.`,
			replyDescription:
				"The helpful and natural response regarding the document and the user's request in the conversation.",
			fallbackEmpty: "I looked at the document, but didn't know what to say.",
			fallbackError:
				"I ran into an issue while processing the document, please try again.",
			mediaFallbackText: `[Document: ${document.fileName}]`,
		};
	}

	if (effectiveMedia) {
		const isAudio = effectiveMedia.mimeType.toLowerCase().startsWith("audio/");
		if (isAudio) {
			return {
				instruction:
					"The user is referring to or asking about the attached audio recording. Listen to the audio and answer their message/question, or make a natural, fitting comment about the audio in the context of the conversation.",
				replyDescription:
					"The reply you will write to the audio recording and the user's message/question in the flow of the conversation.",
				fallbackEmpty: "I listened to the audio, but didn't know what to say.",
				fallbackError: "Couldn't process the audio, please try again.",
				mediaFallbackText: "[Audio]",
			};
		}
		return {
			instruction:
				"The user is referring to or asking about the attached photo. Analyze the photo and answer their message/question, or make a natural, fitting comment about the photo in the context of the conversation.",
			replyDescription:
				"The reply you will write to the photo and the user's message/question in the flow of the conversation.",
			fallbackEmpty: CONFIG.MESSAGES.gemini_empty_image_fallback,
			fallbackError: CONFIG.MESSAGES.gemini_error_image_fallback,
			mediaFallbackText: "[Photo]",
		};
	}

	return {
		instruction: undefined,
		replyDescription:
			"The reply you will write to the chat. A short (1-2 sentences).",
		fallbackEmpty: CONFIG.MESSAGES.gemini_empty_reply_fallback,
		fallbackError: CONFIG.MESSAGES.gemini_error_reply_fallback,
		mediaFallbackText: "[Media]",
	};
}

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
	logger.error(`Error in LLM _generateResponse [${traceId}]:`, error);
	return fallbackError;
}

function shouldEnableToolsForTurn(options: GenerateResponseOptions): boolean {
	return !options.isSpontaneous;
}

function formatUserSenderTag(
	name?: string | null,
	userId?: number,
	username?: string | null,
): string {
	const cleanName = name?.trim() || "Unnamed";
	const handle = username?.trim().replace(/^@/, "");
	const handleSuffix = handle ? ` (@${handle})` : "";
	if (typeof userId === "number" && userId > 0) {
		return `[User #${userId} | ${cleanName}${handleSuffix}]`;
	}
	return `[User ${cleanName}${handleSuffix}]`;
}

function formatMemoriesSection(
	memories: RetrievedMemory[],
	targetUserId?: number,
): string | undefined {
	if (!memories || memories.length === 0) return undefined;
	const speakerFacts: string[] = [];
	const otherFacts: string[] = [];

	for (const m of memories) {
		const text = m.text?.trim();
		if (!text) continue;
		if (
			typeof targetUserId === "number" &&
			targetUserId > 0 &&
			m.userId === targetUserId
		) {
			speakerFacts.push(`- ${text}`);
		} else if (typeof m.userId === "number" && m.userId > 0) {
			otherFacts.push(`- [User #${m.userId}] ${text}`);
		} else {
			otherFacts.push(`- [Group] ${text}`);
		}
	}

	const parts: string[] = [];
	if (speakerFacts.length > 0) {
		parts.push(`### SPEAKER MEMORIES ###\n${speakerFacts.join("\n")}`);
	}
	if (otherFacts.length > 0) {
		parts.push(`### OTHER CHAT MEMORIES ###\n${otherFacts.join("\n")}`);
	}
	return parts.length > 0 ? parts.join("\n\n") : undefined;
}

function resolvePairedUserMessage(
	botMsg: MessageRow,
	prevMsg: MessageRow | undefined,
	subsetIds: Set<number>,
	pairedUserMsgIds: Set<number>,
	msgMap: Map<number, MessageRow>,
): MessageRow | undefined {
	const replyId = botMsg.reply_to_message_id;
	if (replyId && subsetIds.has(replyId)) {
		const parent = msgMap.get(replyId);
		if (
			parent &&
			!parent.is_bot_reply &&
			!pairedUserMsgIds.has(parent.message_id)
		) {
			return parent;
		}
	}
	if (
		prevMsg &&
		!prevMsg.is_bot_reply &&
		!pairedUserMsgIds.has(prevMsg.message_id)
	) {
		return prevMsg;
	}
	return undefined;
}

function extractBotExchangePairs(
	historySubset: MessageRow[],
	msgMap: Map<number, MessageRow>,
): Array<[MessageRow, MessageRow]> {
	const pairs: Array<[MessageRow, MessageRow]> = [];
	const subsetIds = new Set(historySubset.map((m) => m.message_id));
	const pairedUserMsgIds = new Set<number>();

	for (let i = 0; i < historySubset.length; i++) {
		const msg = historySubset[i];
		if (!msg?.is_bot_reply) continue;

		const targetUserMsg = resolvePairedUserMessage(
			msg,
			historySubset[i - 1],
			subsetIds,
			pairedUserMsgIds,
			msgMap,
		);
		if (targetUserMsg) {
			pairedUserMsgIds.add(targetUserMsg.message_id);
			pairs.push([targetUserMsg, msg]);
		}
	}
	return pairs;
}

function formatBackgroundChatSection(
	history: MessageRow[],
	options: GenerateResponseOptions,
): string | undefined {
	if (options.isSpontaneous || history.length <= 1) return undefined;
	const msgMap = new Map<number, MessageRow>();
	for (const m of history) {
		msgMap.set(m.message_id, m);
	}
	const historySubset = history.slice(0, -1).slice(-8);
	const pairedIds = new Set(
		extractBotExchangePairs(historySubset, msgMap)
			.flat()
			.map((m) => m.message_id),
	);
	const unpairedRecent = historySubset
		.filter((m) => !pairedIds.has(m.message_id) && !m.is_bot_reply)
		.slice(-5);

	if (unpairedRecent.length === 0) return undefined;
	const lines = unpairedRecent.map((m) => {
		const sender = formatUserSenderTag(m.first_name, m.user_id, m.username);
		const text =
			cleanUserText(m.text, botUsername) || resolveMessageFallback(m);
		return `- ${sender}: ${text}`;
	});
	return `### RECENT GROUP CHAT LOG (BACKGROUND ONLY - DO NOT ANSWER THESE OLD MESSAGES) ###\n${lines.join("\n")}`;
}

function buildConversationalContextSections(
	history: MessageRow[],
	topicSummary: string | null,
	options: GenerateResponseOptions,
	memories: RetrievedMemory[],
	targetUserId?: number,
): string[] {
	const sections: string[] = [];

	if (
		options.isSpontaneous &&
		topicSummary &&
		topicSummary !== "General chat is going on, no specific topic."
	) {
		sections.push(`### ACTIVE CONVERSATION TOPIC ###\n${topicSummary}`);
	}

	const backgroundChatSection = formatBackgroundChatSection(history, options);
	if (backgroundChatSection) {
		sections.push(backgroundChatSection);
	}

	const memorySection = formatMemoriesSection(memories, targetUserId);
	if (memorySection) {
		sections.push(memorySection);
	}

	if (options.instruction) {
		sections.push(`### SPECIFIC INSTRUCTION ###\n${options.instruction}`);
	}

	if (options.document) {
		const docLines = [
			`### ATTACHED DOCUMENT ###`,
			`Document '${options.document.fileName}' (${options.document.sizeBytes} bytes, ${options.document.mimeType}) is saved in your persistent sandbox workspace. You can read, run, edit, or summarize it using your workspace tools.`,
		];
		if (options.document.summaryHint) {
			docLines.push(`Summary Hint: ${options.document.summaryHint}`);
		}
		if (options.document.textContent) {
			docLines.push(`Content Preview:\n${options.document.textContent}`);
		}
		sections.push(docLines.join("\n"));
	}

	return sections;
}

function formatParentPreviewText(text?: string | null): string {
	if (!text) return "[Media]";
	return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function resolveReplyPrefix(
	replyToId: number | undefined,
	msgMap: Map<number, MessageRow>,
): string {
	if (!replyToId) return "";
	const parent = msgMap.get(replyToId);
	if (!parent) return "";
	const parentSender = parent.is_bot_reply
		? BOT_SENDER_TAG
		: formatUserSenderTag(parent.first_name, parent.user_id, parent.username);
	const preview = formatParentPreviewText(parent.text);
	return `[Replying to ${parentSender}: "${preview}"]\n`;
}

function buildHistoricalUserMessage(
	msg: MessageRow,
	msgMap: Map<number, MessageRow>,
): ChatMessage {
	const senderTag = formatUserSenderTag(
		msg.first_name,
		msg.user_id,
		msg.username,
	);
	const clean =
		cleanUserText(msg.text, botUsername) || resolveMessageFallback(msg);
	const prefix = resolveReplyPrefix(
		msg.reply_to_message_id ?? undefined,
		msgMap,
	);
	return { role: "user", content: `${prefix}${senderTag}: ${clean}` };
}

function buildActiveUserMessage(
	options: GenerateResponseOptions,
	lastMsg: MessageRow | undefined,
	msgMap: Map<number, MessageRow>,
): ChatMessage {
	if (options.targetMessage) {
		const senderTag = formatUserSenderTag(
			options.targetMessage.userName,
			options.targetMessage.userId,
			options.targetMessage.userUsername,
		);
		const text =
			cleanUserText(options.targetMessage.text, botUsername) ||
			options.mediaFallbackText;
		let content = `${senderTag}: ${text}`;
		if (options.targetMessage.replyTo) {
			const replySender = options.targetMessage.replyTo.isBot
				? BOT_SENDER_TAG
				: formatUserSenderTag(
						options.targetMessage.replyTo.senderName,
						options.targetMessage.replyTo.senderId,
						options.targetMessage.replyTo.senderUsername,
					);
			const preview = formatParentPreviewText(
				options.targetMessage.replyTo.text,
			);
			content = `[Replying to ${replySender}: "${preview}"]\n${content}`;
		}
		return { role: "user", content, media: options.media };
	}

	const senderTag = lastMsg?.is_bot_reply
		? BOT_SENDER_TAG
		: formatUserSenderTag(
				lastMsg?.first_name,
				lastMsg?.user_id,
				lastMsg?.username,
			);
	const lastMessageText = resolveLastMessageText(
		lastMsg,
		options.mediaFallbackText,
	);
	const prefix = resolveReplyPrefix(
		lastMsg?.reply_to_message_id ?? undefined,
		msgMap,
	);
	return {
		role: "user",
		content: `${prefix}${senderTag}: ${lastMessageText}`,
		media: options.media,
	};
}

function buildSpontaneousMessages(
	history: MessageRow[],
	mediaFallbackText: string,
): ChatMessage[] {
	const recentSlice = history.slice(-6);
	const lines = recentSlice.map((m) => {
		const sender = m.is_bot_reply
			? BOT_SENDER_TAG
			: formatUserSenderTag(m.first_name, m.user_id, m.username);
		const text = resolveLastMessageText(m, mediaFallbackText);
		return `${sender}: ${text}`;
	});
	const transcript = lines.length > 0 ? `${lines.join("\n")}\n\n` : "";
	return [
		{
			role: "user",
			content: `${transcript}Observe the ongoing chat above and chime in naturally with a short, witty, or helpful spontaneous comment as ket.ai in the same language as the chat.`,
		},
	];
}

function buildConversationalMessages(
	history: MessageRow[],
	options: GenerateResponseOptions,
): ChatMessage[] {
	if (options.isSpontaneous) {
		return buildSpontaneousMessages(history, options.mediaFallbackText);
	}

	const messages: ChatMessage[] = [];
	const lastMsg = history[history.length - 1];
	const msgMap = new Map<number, MessageRow>();
	for (const m of history) {
		msgMap.set(m.message_id, m);
	}

	const historySubset =
		history.length > 1 ? history.slice(0, history.length - 1).slice(-8) : [];

	for (const [userMsg, botMsg] of extractBotExchangePairs(
		historySubset,
		msgMap,
	)) {
		messages.push(buildHistoricalUserMessage(userMsg, msgMap));
		messages.push({
			role: "assistant",
			content: botMsg.text || options.mediaFallbackText,
		});
	}

	messages.push(buildActiveUserMessage(options, lastMsg, msgMap));
	return messages;
}

function resolveMaxOutputTokens(
	isAgentic: boolean,
	isConversationalProvider: boolean,
): number {
	if (!isAgentic) {
		return isConversationalProvider ? 2048 : 1024;
	}
	if (isConversationalProvider) {
		return 4096;
	}
	if (CONFIG.MAX_TOOL_OUTPUT_TOKENS && CONFIG.MAX_TOOL_OUTPUT_TOKENS > 0) {
		return CONFIG.MAX_TOOL_OUTPUT_TOKENS;
	}
	return 8192;
}

function buildGenConfig(
	personaPrompt: string | undefined,
	contextSections?: string[],
	enableTools = true,
): Record<string, unknown> {
	const declarations = enableTools
		? toolRegistry.getFunctionDeclarations()
		: [];
	const isAgentic = declarations.length > 0;
	const isConversationalProvider = CONFIG.LLM_PROVIDER === "openai";
	const systemInstruction = getSystemInstruction(
		personaPrompt,
		isAgentic ? declarations.map((t) => t.name) : undefined,
		contextSections,
	);

	return {
		systemInstruction,
		maxOutputTokens: resolveMaxOutputTokens(
			isAgentic,
			isConversationalProvider,
		),
		tools: isAgentic
			? isConversationalProvider
				? declarations
				: [{ functionDeclarations: declarations }]
			: undefined,
	};
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
	const isPrivate = Boolean(
		targetUserId && chatIdStr === targetUserId.toString(),
	);
	return await getRelevantMemories(chatIdStr, queryForMemory, {
		activeTopic: topicSummary || undefined,
		history,
		senderUserId: targetUserId,
		isPrivateChat: isPrivate,
	});
}

function recordSummarizedCount(chatIdStr: string, count: number): void {
	lastSummarizedCount.set(chatIdStr, count);
	if (lastSummarizedCount.size > MAX_TRACKED_CHATS) {
		const firstKey = lastSummarizedCount.keys().next().value;
		if (firstKey) lastSummarizedCount.delete(firstKey);
	}
}

export const LlmService = {
	async _generateResponse(
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
					`[LLM:${traceId}] _generateResponse called with empty history. Returning fallback.`,
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
			const chatMessages = buildConversationalMessages(history, options);
			const contents =
				CONFIG.LLM_PROVIDER === "openai"
					? (chatMessages as unknown as Array<Record<string, unknown>>)
					: convertChatMessagesToGeminiContents(chatMessages);
			const genConfig = buildGenConfig(
				personaPrompt,
				contextSections,
				enableTools,
			);

			const responseText = await runAgentLoop(contents, genConfig, {
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
	},

	async ensureTopicSummary(
		chatIdStr: string,
		currentTopic: string | null,
	): Promise<string> {
		const currentCount = Repository.getMessageCount(chatIdStr);
		if (currentTopic && !lastSummarizedCount.has(chatIdStr)) {
			recordSummarizedCount(chatIdStr, currentCount);
			return currentTopic;
		}

		const lastCount = lastSummarizedCount.get(chatIdStr) || 0;
		const shouldSummarize =
			(!currentTopic && currentCount >= 6) || currentCount - lastCount >= 10;

		if (shouldSummarize) {
			recordSummarizedCount(chatIdStr, currentCount);
			const history = Repository.getRecentMessages(chatIdStr, 20);
			void this.summarizeTopic(history)
				.then((summary) => {
					if (summary) {
						Repository.updateChatSettings(chatIdStr, {
							current_topic: summary,
						});
						logger.info(
							`[Summarizer] Updated topic summary for ${chatIdStr}: "${summary}"`,
						);
					}
				})
				.catch((err) => {
					logger.warn(`[Summarizer] Background summary failed:`, err);
				});
		}

		return currentTopic || "";
	},

	async generateReply(options: GenerateReplyOptions): Promise<string> {
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

		return this._generateResponse(history, topicSummary, {
			chatId,
			isSpontaneous,
			media: effectiveMedia,
			document,
			instruction: fallbacks.instruction,
			replyDescription: fallbacks.replyDescription,
			fallbackEmpty: fallbacks.fallbackEmpty,
			fallbackError: fallbacks.fallbackError,
			mediaFallbackText: fallbacks.mediaFallbackText,
			onEvent,
			signal,
			targetMessage,
		});
	},

	async summarizeTopic(history: MessageRow[]): Promise<string> {
		try {
			if (history.length === 0) return "";

			const lines = history
				.slice(-20)
				.map((msg) => {
					const sender = msg.is_bot_reply ? "ket.ai" : msg.first_name || "User";
					const text = (msg.text || "[Media]").slice(0, 150);
					return `${sender}: ${text}`;
				})
				.join("\n");

			const schema = {
				type: "OBJECT",
				properties: {
					summary: {
						type: "STRING",
						description: "1-2 sentence summary of the current chat topic.",
					},
				},
				required: ["summary"],
			};

			const parsed = await getLlmProvider().generateStructured<{
				summary?: string;
			}>(
				`Summarize the main topic of this conversation in 1-2 short sentences:\n\n${lines}`,
				schema,
				"Summarize group chats in 1-2 concise sentences.",
			);

			return typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
		} catch (error) {
			logger.error("Error in summarizeTopic:", error);
			return "";
		}
	},
};
