import {
	type AgentEventHandler,
	runAgentLoop,
	toolRegistry,
} from "../../agent/index";
import { CONFIG } from "../../config";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import type { PreparedDocumentContext } from "../gemini/documentPerception";
import { getRelevantMemories } from "../gemini/memory";
import {
	MEMORY_UPDATE_ITEM_SCHEMA,
	saveExtractedMemories,
} from "../gemini/memoryWorker";
import {
	buildHistoryList,
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
	return cleanUserText(lastMsg.text) || mediaFallback;
}

function resolveSenderDescription(lastMsg?: MessageRow): string {
	if (!lastMsg) return "User: unnamed";
	if (lastMsg.is_bot_reply) return "You (ket.ai)";
	const suffix = lastMsg.username ? ` (@${lastMsg.username})` : "";
	return `User_${lastMsg.user_id} (${lastMsg.first_name || "Unnamed"}${suffix})`;
}

function buildCurrentMessageToReply(
	options: GenerateResponseOptions,
	lastMsg?: MessageRow,
	lastMessageText = "",
): Record<string, unknown> {
	if (options.targetMessage) {
		const usernameSuffix = options.targetMessage.userUsername
			? ` (@${options.targetMessage.userUsername})`
			: "";
		const senderDesc = `User_${options.targetMessage.userId} (${options.targetMessage.userName || "Unnamed"}${usernameSuffix})`;
		const cleanText =
			cleanUserText(options.targetMessage.text) || options.mediaFallbackText;

		const currentMsgObj: Record<string, unknown> = {
			message_id: options.targetMessage.messageId,
			sender_id: options.targetMessage.userId,
			sender: senderDesc,
			text: cleanText,
		};

		if (options.targetMessage.replyTo) {
			currentMsgObj.replying_to = {
				message_id: options.targetMessage.replyTo.messageId,
				sender: options.targetMessage.replyTo.senderName,
				text: options.targetMessage.replyTo.text,
			};
		}
		return currentMsgObj;
	}

	return {
		sender: resolveSenderDescription(lastMsg),
		text: lastMessageText,
	};
}

function buildDocumentAttachment(doc: PreparedDocumentContext) {
	return {
		filename: doc.fileName,
		mime_type: doc.mimeType,
		size_bytes: doc.sizeBytes,
		is_text: doc.isText,
		is_truncated: doc.isTruncated,
		content: doc.textContent,
		summary_hint: doc.summaryHint,
		workspace_saved: true,
		workspace_filename: doc.fileName,
	};
}

function buildInputPayload(
	history: MessageRow[],
	topicSummary: string | null,
	options: GenerateResponseOptions,
	memories: unknown[],
): Record<string, unknown> {
	const lastMsg = history[history.length - 1];
	const lastMessageText = resolveLastMessageText(
		lastMsg,
		options.mediaFallbackText,
	);
	const historyList = buildHistoryList(history, undefined, options.chatId);

	const inputPayload: Record<string, unknown> = {
		active_topic:
			topicSummary || "General chat is going on, no specific topic.",
		recent_messages: historyList,
		memories,
	};

	if (options.instruction) {
		inputPayload.instruction = options.instruction;
	}

	if (options.document) {
		inputPayload.attached_document = buildDocumentAttachment(options.document);
		const docGuidance = `Document '${options.document.fileName}' is available in your persistent workspace. You can inspect it, summarize it, execute it with execute_code (Python/Bash/Bun), or edit it with edit_workspace_file/write_workspace_file and deliver it to the user with send_workspace_file.`;
		inputPayload.instruction = inputPayload.instruction
			? `${inputPayload.instruction} ${docGuidance}`
			: docGuidance;
	}

	if (options.isSpontaneous) {
		inputPayload.interaction_type = "spontaneous_comment";
	} else {
		inputPayload.interaction_type = "direct_reply";
		inputPayload.current_message_to_reply = buildCurrentMessageToReply(
			options,
			lastMsg,
			lastMessageText,
		);
	}

	const activeText = options.targetMessage?.text || lastMessageText;
	const hasExplicitMemoryIntent =
		/\b(?:remember this|keep in mind|note this|save this|don'?t forget|bunu unutma|aklında tut|not et|hafızana yaz|kaydet|bunu hatırla)\b/i.test(
			activeText,
		);
	if (hasExplicitMemoryIntent) {
		inputPayload.instruction =
			(inputPayload.instruction ? `${inputPayload.instruction} ` : "") +
			"IMPORTANT: The user explicitly requested to remember information from this message. Make sure to extract all personal facts/details into new_memory_updates.";
	}

	return inputPayload;
}

function buildResponseSchemaProperties(
	replyDescription: string,
): Record<string, unknown> {
	return {
		reply: {
			type: "STRING",
			description: replyDescription,
		},
		new_memory_updates: {
			type: "ARRAY",
			description:
				"List of new facts to remember. DO NOT save facts based on your own generated replies, assumptions, or jokes. Leave empty [] if no meaningful user facts exist.",
			items: MEMORY_UPDATE_ITEM_SCHEMA,
		},
	};
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

async function handleJsonReply(
	cleanedText: string,
	rawText: string,
	chatIdStr: string,
	traceId: string,
	history: MessageRow[] = [],
	lastMsg?: MessageRow,
	senderUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): Promise<string> {
	try {
		const parsed = JSON.parse(cleanedText);

		const effectiveSenderId =
			senderUserId ??
			(lastMsg && !lastMsg.is_bot_reply ? lastMsg.user_id : undefined);

		if (
			parsed &&
			typeof parsed === "object" &&
			Array.isArray(parsed.new_memory_updates) &&
			parsed.new_memory_updates.length > 0
		) {
			saveExtractedMemories(
				chatIdStr,
				parsed.new_memory_updates,
				history,
				effectiveSenderId,
				senderFirstName,
				senderUsername,
			).catch((err) => {
				logger.error(
					`[LLM:${traceId}] Error persisting extracted memories:`,
					err,
				);
			});
		}

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

async function parseAndProcessReply(
	responseText: string,
	chatIdStr: string,
	traceId: string,
	history: MessageRow[] = [],
	lastMsg?: MessageRow,
	senderUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): Promise<string> {
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
		const jsonReply = await handleJsonReply(
			jsonStr,
			responseText,
			chatIdStr,
			traceId,
			history,
			lastMsg,
			senderUserId,
			senderFirstName,
			senderUsername,
		);
		if (jsonReply) return stripEmoji(jsonReply).trim();
	}

	return stripEmoji(trimmed).trim();
}

function buildInitialContents(
	inputPayload: Record<string, unknown>,
	media?: { buffer: Buffer; mimeType: string },
): Array<Record<string, unknown>> {
	const initialParts: Array<Record<string, unknown>> = [
		{ text: JSON.stringify(inputPayload) },
	];
	if (media) {
		initialParts.push({
			inlineData: {
				mimeType: media.mimeType,
				data: media.buffer.toString("base64"),
			},
		});
	}
	return [{ role: "user", parts: initialParts }];
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

function formatMemoriesSection(memories: unknown[]): string | undefined {
	if (!memories || memories.length === 0) return undefined;
	const facts = memories
		.map((m) => {
			if (typeof m === "string") return m.trim();
			if (typeof m === "object" && m !== null) {
				const fact =
					(m as { fact?: string; text?: string }).fact ||
					(m as { fact?: string; text?: string }).text;
				if (fact) return fact.trim();
			}
			return "";
		})
		.filter(Boolean);
	if (facts.length === 0) return undefined;
	return `### RELEVANT USER & CHAT FACTS ###\n${facts.map((f) => `- ${f}`).join("\n")}`;
}

function buildConversationalContextSections(
	topicSummary: string | null,
	options: GenerateResponseOptions,
	memories: unknown[],
): string[] {
	const sections: string[] = [];

	if (
		topicSummary &&
		topicSummary !== "General chat is going on, no specific topic."
	) {
		sections.push(`### ACTIVE CONVERSATION TOPIC ###\n${topicSummary}`);
	}

	const memorySection = formatMemoriesSection(memories);
	if (memorySection) {
		sections.push(memorySection);
	}

	if (options.instruction) {
		sections.push(`### SPECIFIC INSTRUCTION ###\n${options.instruction}`);
	}

	if (options.document) {
		sections.push(
			`### ATTACHED DOCUMENT ###\nDocument '${options.document.fileName}' (${options.document.sizeBytes} bytes) is saved in your persistent sandbox workspace. You can read, run, edit, or summarize it using your workspace tools.`,
		);
	}

	return sections;
}

function formatParentPreviewText(text?: string | null): string {
	if (!text) return "[Media]";
	return text.length > 40 ? `${text.slice(0, 37)}...` : text;
}

function resolveReplyPrefix(
	replyToId: number | undefined,
	msgMap: Map<number, MessageRow>,
): string {
	if (!replyToId) return "";
	const parent = msgMap.get(replyToId);
	if (!parent) return "";
	const parentSender = parent.is_bot_reply
		? "You (ket.ai)"
		: parent.first_name || "User";
	const preview = formatParentPreviewText(parent.text);
	return `[Replying to ${parentSender}: "${preview}"]\n`;
}

function buildHistoricalUserMessage(
	msg: MessageRow,
	msgMap: Map<number, MessageRow>,
): ChatMessage {
	const senderName =
		msg.first_name || (msg.user_id ? `User_${msg.user_id}` : "User");
	const clean = cleanUserText(msg.text) || resolveMessageFallback(msg);
	const prefix = resolveReplyPrefix(msg.reply_to_message_id, msgMap);
	return { role: "user", content: `${prefix}${senderName}: ${clean}` };
}

function buildActiveUserMessage(
	options: GenerateResponseOptions,
	lastMsg: MessageRow | undefined,
): ChatMessage {
	if (options.targetMessage) {
		const sender = options.targetMessage.userName || "User";
		const text =
			cleanUserText(options.targetMessage.text) || options.mediaFallbackText;
		let content = `${sender}: ${text}`;
		if (options.targetMessage.replyTo) {
			const preview = formatParentPreviewText(
				options.targetMessage.replyTo.text,
			);
			content = `[Replying to ${options.targetMessage.replyTo.senderName}: "${preview}"]\n${content}`;
		}
		return { role: "user", content, media: options.media };
	}

	const sender = resolveSenderDescription(lastMsg);
	const lastMessageText = resolveLastMessageText(
		lastMsg,
		options.mediaFallbackText,
	);
	return {
		role: "user",
		content: `${sender}: ${lastMessageText}`,
		media: options.media,
	};
}

function buildSpontaneousMessages(
	lastMsg: MessageRow | undefined,
	mediaFallbackText: string,
): ChatMessage[] {
	const messages: ChatMessage[] = [];
	if (lastMsg) {
		const senderName = lastMsg.is_bot_reply
			? "You (ket.ai)"
			: lastMsg.first_name || "User";
		const lastText = resolveLastMessageText(lastMsg, mediaFallbackText);
		messages.push({
			role: lastMsg.is_bot_reply ? "assistant" : "user",
			content: `${senderName}: ${lastText}`,
		});
	}
	messages.push({
		role: "user",
		content:
			"You observe the ongoing chat above. Chime in naturally with a short, witty, or helpful spontaneous comment as ket.ai.",
	});
	return messages;
}

function buildConversationalMessages(
	history: MessageRow[],
	options: GenerateResponseOptions,
): ChatMessage[] {
	const messages: ChatMessage[] = [];
	const lastMsg = history[history.length - 1];
	const msgMap = new Map<number, MessageRow>();
	for (const m of history) {
		msgMap.set(m.message_id, m);
	}

	const historySubset =
		history.length > 1 ? history.slice(0, history.length - 1) : [];

	for (const msg of historySubset) {
		if (msg.is_bot_reply) {
			messages.push({
				role: "assistant",
				content: msg.text || options.mediaFallbackText,
			});
		} else {
			messages.push(buildHistoricalUserMessage(msg, msgMap));
		}
	}

	if (options.isSpontaneous) {
		messages.push(
			...buildSpontaneousMessages(lastMsg, options.mediaFallbackText),
		);
		return messages;
	}

	messages.push(buildActiveUserMessage(options, lastMsg));
	return messages;
}

function buildGenConfig(
	personaPrompt: string | undefined,
	replyDescription: string,
	contextSections?: string[],
): Record<string, unknown> {
	const isAgentic = toolRegistry.count > 0;
	const isConversationalProvider = CONFIG.LLM_PROVIDER === "openai";
	const systemInstruction = getSystemInstruction(
		personaPrompt,
		toolRegistry.getAllTools().map((t) => t.name),
		contextSections,
	);

	const genConfig: Record<string, unknown> = {
		systemInstruction,
		maxOutputTokens: isAgentic
			? isConversationalProvider
				? 4096
				: CONFIG.MAX_TOOL_OUTPUT_TOKENS && CONFIG.MAX_TOOL_OUTPUT_TOKENS > 0
					? CONFIG.MAX_TOOL_OUTPUT_TOKENS
					: undefined
			: 2048,
		tools: isAgentic ? toolRegistry.getFunctionDeclarations() : undefined,
	};

	if (!isAgentic && !isConversationalProvider) {
		genConfig.responseMimeType = "application/json";
		genConfig.responseSchema = {
			type: "OBJECT",
			properties: buildResponseSchemaProperties(replyDescription),
			required: ["reply"],
		};
	}

	return genConfig;
}

async function loadContextMemories(
	chatIdStr: string,
	history: MessageRow[],
	topicSummary: string | null,
	options: GenerateResponseOptions,
	lastMessageText: string,
	targetUserId?: number,
): Promise<unknown[]> {
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

			const isConversationalProvider = CONFIG.LLM_PROVIDER === "openai";
			let contents: Array<Record<string, unknown>>;
			let genConfig: Record<string, unknown>;

			if (isConversationalProvider) {
				const contextSections = buildConversationalContextSections(
					topicSummary,
					options,
					memories,
				);
				contents = buildConversationalMessages(
					history,
					options,
				) as unknown as Array<Record<string, unknown>>;
				genConfig = buildGenConfig(
					personaPrompt,
					options.replyDescription,
					contextSections,
				);
			} else {
				const inputPayload = buildInputPayload(
					history,
					topicSummary,
					options,
					memories,
				);
				contents = buildInitialContents(inputPayload, options.media);
				genConfig = buildGenConfig(personaPrompt, options.replyDescription);
			}

			const responseText = await runAgentLoop(contents, genConfig, {
				chatId: chatIdStr,
				sessionId: chatIdStr,
				traceId,
				onEvent: options.onEvent,
				signal: options.signal,
			});

			return await parseAndProcessReply(
				responseText,
				chatIdStr,
				traceId,
				history,
				lastMsg,
				targetUserId,
				options.targetMessage?.userName,
				options.targetMessage?.userUsername,
			);
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
		const lastCount = lastSummarizedCount.get(chatIdStr) || 0;

		if (!currentTopic || currentCount - lastCount >= 20) {
			logger.info(
				`[Summarizer] Triggering on-demand topic summary for group ${chatIdStr}...`,
			);
			const history = Repository.getRecentMessages(chatIdStr, 30);
			const summary = await this.summarizeTopic(history);
			if (summary) {
				Repository.updateChatSettings(chatIdStr, {
					current_topic: summary,
				});
				lastSummarizedCount.set(chatIdStr, currentCount);
				if (lastSummarizedCount.size > MAX_TRACKED_CHATS) {
					const firstKey = lastSummarizedCount.keys().next().value;
					if (firstKey) lastSummarizedCount.delete(firstKey);
				}
				logger.info(
					`[Summarizer] New topic summary for ${chatIdStr}: "${summary}"`,
				);
				return summary;
			}
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

			const historyList = history.map((msg) => ({
				sender: msg.is_bot_reply
					? "You (ket.ai)"
					: `User: ${msg.first_name || "Unnamed"}`,
				text: msg.text || "[Media]",
			}));

			const prompt =
				"Analyze the conversations below. Summarize the main topic of conversation or the situation being discussed by a person in a maximum of 1–2 sentences.";

			const schema = {
				type: "OBJECT",
				properties: {
					summary: {
						type: "STRING",
						description:
							"A 1-2 sentence text summarizing the current topic of the group chat.",
					},
				},
				required: ["summary"],
			};

			const parsed = await getLlmProvider().generateStructured<{
				summary?: string;
			}>(
				JSON.stringify({
					messages: historyList,
					instruction: prompt,
				}),
				schema,
				"You are an analysis expert. You summarize group chats in just 1-2 sentences.",
			);

			return typeof parsed?.summary === "string" ? parsed.summary.trim() : "";
		} catch (error) {
			logger.error("Error in summarizeTopic:", error);
			return "";
		}
	},
};
