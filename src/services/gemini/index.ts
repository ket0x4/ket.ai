import {
	AgentStateMachine,
	type MediaGeneratedCallback,
	runAgentLoop,
	type ToolCallCallback,
	type ToolProgressCallback,
	toolRegistry,
} from "../../agent/index";
import { CONFIG } from "../../config";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { ai } from "./client";
import type { PreparedDocumentContext } from "./documentPerception";
import { describeImage, transcribeAudio } from "./mediaPerception";
import { getRelevantMemories, processNewMemory } from "./memory";
import {
	buildHistoryList,
	cleanUserText,
	getSystemInstruction,
	getThinkingConfig,
	resolveTargetUserId,
	runWithRetry,
} from "./utils";

export type {
	ArtifactMediaType,
	GeneratedMediaArtifact,
	MediaGeneratedCallback,
	ToolCallCallback,
	ToolProgressCallback,
	ToolProgressUpdate,
} from "../../agent/index";
export type { PreparedDocumentContext } from "./documentPerception";

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
	onToolCall?: ToolCallCallback;
	onToolProgress?: ToolProgressCallback;
	onMediaGenerated?: MediaGeneratedCallback;
	targetMessage?: TargetMessageInfo;
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
		const docGuidance = `Document '${options.document.fileName}' is available in your persistent workspace. You can inspect it, summarize it, execute it with execute_code (Python/Bash/Bun), or edit it and send it to the user with send_workspace_file or write_workspace_file (with sendToUser: true).`;
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
			items: {
				type: "OBJECT",
				properties: {
					user_id: {
						type: "INTEGER",
						description:
							"The integer user_id extracted from User_ID field if available.",
					},
					user_name: {
						type: "STRING",
						description: "The first name of the user who stated the fact.",
					},
					fact: {
						type: "STRING",
						description:
							"The factual detail stated by the user (e.g., likes pizza, is a software engineer). Do not use the word 'User'.",
					},
					category: {
						type: "STRING",
						description:
							"Category of fact: 'PROFILE' for permanent personal facts, 'DYNAMIC' for medium-term status, 'TEMPORARY' for short-lived events.",
					},
					ttl_days: {
						type: "INTEGER",
						description:
							"Days after which temporary memory expires (e.g. 1-7 days). Leave null/0 for permanent facts.",
					},
				},
				required: ["user_name", "fact"],
			},
		},
	};
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

async function processExtractedMemories(
	chatIdStr: string,
	memoryUpdates: unknown[],
	history: MessageRow[] = [],
	senderUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): Promise<void> {
	if (
		!Array.isArray(memoryUpdates) ||
		!chatIdStr ||
		memoryUpdates.length === 0
	) {
		return;
	}

	for (const mem of memoryUpdates as Array<{
		user_id?: number;
		user_name?: string;
		fact?: string;
		category?: string;
		ttl_days?: number;
	}>) {
		if (!mem.user_name || !mem.fact) continue;
		const combinedFact = `${mem.user_name}: ${mem.fact}`;
		const cat =
			(mem.category as "PROFILE" | "DYNAMIC" | "TEMPORARY") || "PROFILE";
		const ttl =
			typeof mem.ttl_days === "number" && mem.ttl_days > 0
				? mem.ttl_days
				: cat === "TEMPORARY"
					? 3
					: null;

		const targetUserId = resolveTargetUserId(
			mem.user_name,
			mem.user_id,
			history,
			senderUserId,
			senderFirstName,
			senderUsername,
		);

		await processNewMemory(chatIdStr, combinedFact, {
			userId: targetUserId,
			category: cat,
			ttlDays: ttl,
			priority: "low",
		});
	}
}

function buildGenConfig(
	options: GenerateResponseOptions,
	toolsConfig?: Array<Record<string, unknown>>,
): Record<string, unknown> {
	const genConfig: Record<string, unknown> = {
		systemInstruction: getSystemInstruction(options.personaPrompt),
		temperature: toolsConfig ? 0.45 : options.media ? 0.7 : 0.75,
		maxOutputTokens: 2048,
		thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
		tools: toolsConfig,
	};

	if (!toolsConfig) {
		genConfig.responseMimeType = "application/json";
		genConfig.responseSchema = {
			type: "OBJECT",
			properties: buildResponseSchemaProperties(options.replyDescription),
			required: ["reply"],
		};
	}

	return genConfig;
}

function isStrayBracket(text: string): boolean {
	return text === "}" || text === "{" || text === "[]" || text === "{}";
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
	fsm: AgentStateMachine,
	history: MessageRow[] = [],
	lastMsg?: MessageRow,
	senderUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): Promise<string> {
	try {
		const parsed = JSON.parse(cleanedText);

		fsm.transition("PERSISTING_DATA");
		const effectiveSenderId =
			senderUserId ??
			(lastMsg && !lastMsg.is_bot_reply ? lastMsg.user_id : undefined);

		if (
			parsed &&
			typeof parsed === "object" &&
			Array.isArray(parsed.new_memory_updates) &&
			parsed.new_memory_updates.length > 0
		) {
			processExtractedMemories(
				chatIdStr,
				parsed.new_memory_updates,
				history,
				effectiveSenderId,
				senderFirstName,
				senderUsername,
			).catch((err) => {
				logger.error(
					`[Gemini:${fsm.getTraceId()}] Error persisting extracted memories:`,
					err,
				);
			});
		}

		fsm.transition("COMPLETED");

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
		logger.warn(
			`[Gemini:${fsm.getTraceId()}] Parse error on model JSON response. Using cleaned plain text. Raw text: "${rawText}"`,
		);
		fsm.transition("COMPLETED");
		return cleanedText;
	}
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
	fsm: AgentStateMachine,
	history: MessageRow[] = [],
	lastMsg?: MessageRow,
	senderUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): Promise<string> {
	if (fsm.isTerminal()) {
		return responseText;
	}

	const trimmed = responseText?.trim() || "";
	if (!trimmed) {
		fsm.transition("COMPLETED");
		return "";
	}

	if (isStrayBracket(trimmed)) {
		logger.warn(
			`[Gemini:${fsm.getTraceId()}] Model returned stray bracket/empty payload: "${trimmed}". Suppressing reply.`,
		);
		fsm.transition("COMPLETED");
		return "";
	}

	const jsonStr = tryExtractJsonString(trimmed);
	if (jsonStr) {
		const jsonReply = await handleJsonReply(
			jsonStr,
			responseText,
			chatIdStr,
			fsm,
			history,
			lastMsg,
			senderUserId,
			senderFirstName,
			senderUsername,
		);
		if (jsonReply) return jsonReply;
	}

	// Markdown or plain text response (e.g. from tool execution or unstructured output)
	fsm.transition("COMPLETED");
	return trimmed;
}

export const GeminiService = {
	async _generateResponse(
		history: MessageRow[],
		topicSummary: string | null,
		options: GenerateResponseOptions,
	): Promise<string> {
		const fsm = new AgentStateMachine(options.traceId);
		try {
			if (history.length === 0) {
				logger.warn(
					`[Gemini:${fsm.getTraceId()}] _generateResponse called with empty history. Returning fallback.`,
				);
				return options.fallbackEmpty;
			}
			fsm.transition("INITIALIZING");
			const chatIdStr = options.chatId || history[0]?.chat_id?.toString() || "";
			const lastMsg = history[history.length - 1];
			const lastMessageText = resolveLastMessageText(
				lastMsg,
				options.mediaFallbackText,
			);

			// Resolve active persona for chat if not already supplied
			let personaPrompt = options.personaPrompt;
			if (personaPrompt === undefined && chatIdStr) {
				const activePersona = Repository.getActivePersonaForChat(chatIdStr);
				personaPrompt = activePersona?.prompt;
			}

			const queryForMemory = options.isSpontaneous
				? topicSummary || "General chat"
				: lastMessageText;
			const targetUserId =
				options.targetMessage?.userId ??
				(lastMsg && !lastMsg.is_bot_reply ? lastMsg.user_id : undefined);
			const senderFirstName = options.targetMessage?.userName;
			const senderUsername = options.targetMessage?.userUsername;
			const isPrivate = Boolean(
				targetUserId && chatIdStr === targetUserId.toString(),
			);

			const memories = chatIdStr
				? await getRelevantMemories(chatIdStr, queryForMemory, {
						activeTopic: topicSummary || undefined,
						history,
						senderUserId: targetUserId,
						isPrivateChat: isPrivate,
					})
				: [];

			const inputPayload = buildInputPayload(
				history,
				topicSummary,
				options,
				memories,
			);
			const contents = buildInitialContents(inputPayload, options.media);

			const toolsConfig =
				toolRegistry.count > 0
					? [
							{
								functionDeclarations: toolRegistry.getFunctionDeclarations(),
							},
						]
					: undefined;

			const effectiveOptions: GenerateResponseOptions = {
				...options,
				personaPrompt,
			};
			const genConfig = buildGenConfig(effectiveOptions, toolsConfig);

			const responseText = await runAgentLoop(contents, genConfig, fsm, {
				chatId: chatIdStr,
				sessionId: chatIdStr,
				onToolCall: options.onToolCall,
				onToolProgress: options.onToolProgress,
				onMediaGenerated: options.onMediaGenerated,
			});

			const reply = await parseAndProcessReply(
				responseText,
				chatIdStr,
				fsm,
				history,
				lastMsg,
				targetUserId,
				senderFirstName,
				senderUsername,
			);
			// If reply is empty (e.g. suppressed due to parse error), do not send fallback message
			return reply;
		} catch (error) {
			fsm.fail(error);
			logger.error(
				`Error in Gemini _generateResponse [${fsm.getTraceId()}]:`,
				error,
			);
			return options.fallbackError;
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

	async generateReply(
		history: MessageRow[],
		topicSummary: string | null,
		isSpontaneous: boolean = false,
		onToolCall?: ToolCallCallback,
		chatId?: string,
		media?: { buffer: Buffer; mimeType: string },
		onMediaGenerated?: MediaGeneratedCallback,
		onToolProgress?: ToolProgressCallback,
		document?: PreparedDocumentContext,
		targetMessage?: TargetMessageInfo,
	): Promise<string> {
		const effectiveMedia = media || document?.mediaPayload;

		let instruction: string | undefined;
		if (document) {
			instruction = `The user is referring to or asking about the document '${document.fileName}'. It is saved in your sandbox workspace. Inspect, run (via execute_code), edit/modify (via write_workspace_file/send_workspace_file), or summarize it according to the user's message.`;
		} else if (media) {
			instruction =
				"The user is referring to or asking about the attached photo. Analyze the photo and answer their message/question, or make a natural, fitting comment about the photo in the context of the conversation.";
		}

		let replyDescription: string;
		if (document) {
			replyDescription =
				"The helpful and natural response regarding the document and the user's request in the conversation.";
		} else if (media) {
			replyDescription =
				"The reply you will write to the photo and the user's message/question in the flow of the conversation.";
		} else {
			replyDescription =
				"The reply you will write to the chat. A short (1-2 sentences).";
		}

		const fallbackEmpty = document
			? "I looked at the document, but didn't know what to say."
			: media
				? CONFIG.MESSAGES.gemini_empty_image_fallback
				: CONFIG.MESSAGES.gemini_empty_reply_fallback;

		const fallbackError = document
			? "I ran into an issue while processing the document, please try again."
			: media
				? CONFIG.MESSAGES.gemini_error_image_fallback
				: CONFIG.MESSAGES.gemini_error_reply_fallback;

		const mediaFallbackText = document
			? `[Document: ${document.fileName}]`
			: media
				? "[Photo]"
				: "[Media]";

		return this._generateResponse(history, topicSummary, {
			chatId,
			isSpontaneous,
			media: effectiveMedia,
			document,
			instruction,
			replyDescription,
			fallbackEmpty,
			fallbackError,
			mediaFallbackText,
			onToolCall,
			onToolProgress,
			onMediaGenerated,
			targetMessage,
		});
	},

	async generateDocumentReply(
		document: PreparedDocumentContext,
		history: MessageRow[],
		topicSummary: string | null,
		onToolCall?: ToolCallCallback,
		chatId?: string,
		onMediaGenerated?: MediaGeneratedCallback,
		onToolProgress?: ToolProgressCallback,
		targetMessage?: TargetMessageInfo,
	): Promise<string> {
		return this.generateReply(
			history,
			topicSummary,
			false,
			onToolCall,
			chatId,
			document.mediaPayload,
			onMediaGenerated,
			onToolProgress,
			document,
			targetMessage,
		);
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

			const response = await runWithRetry(
				() =>
					ai.models.generateContent({
						model: CONFIG.GEMINI_MODEL,
						contents: JSON.stringify({
							messages: historyList,
							instruction: prompt,
						}),
						config: {
							systemInstruction:
								"You are an analysis expert. You summarize group chats in just 1-2 sentences.",
							temperature: 0.3,
							maxOutputTokens: 1024,
							thinkingConfig: getThinkingConfig(CONFIG.GEMINI_MODEL),
							responseMimeType: "application/json",
							responseSchema: {
								type: "OBJECT",
								properties: {
									summary: {
										type: "STRING",
										description:
											"A 1-2 sentence text summarizing the current topic of the group chat.",
									},
								},
								required: ["summary"],
							},
						},
					}),
				{ priority: "low" },
			);

			const responseText = response.text?.trim() || "";
			if (!responseText) return "";

			try {
				const cleaned = responseText
					.replace(/^```(?:json)?\n?|\n?```$/g, "")
					.trim();
				const parsed = JSON.parse(cleaned);
				return typeof parsed.summary === "string" ? parsed.summary.trim() : "";
			} catch {
				logger.warn(
					`[Summarizer] Failed to parse summary JSON. Raw text: "${responseText}"`,
				);
				return "";
			}
		} catch (error) {
			logger.error("Error in Gemini summarizeTopic:", error);
			return "";
		}
	},

	async generateMediaReply(
		media: { buffer: Buffer; mimeType: string },
		history: MessageRow[],
		topicSummary: string | null,
		options: {
			instruction: string;
			replyDescription: string;
			fallbackEmpty: string;
			fallbackError: string;
			mediaFallbackText: string;
			onToolCall?: ToolCallCallback;
			onToolProgress?: ToolProgressCallback;
			onMediaGenerated?: MediaGeneratedCallback;
			chatId?: string;
			targetMessage?: TargetMessageInfo;
		},
	): Promise<string> {
		return this._generateResponse(history, topicSummary, {
			media,
			...options,
		});
	},

	async generateImageReply(
		imageBuffer: Buffer,
		mimeType: string,
		history: MessageRow[],
		topicSummary: string | null,
		onToolCall?: ToolCallCallback,
		chatId?: string,
		onToolProgress?: ToolProgressCallback,
		targetMessage?: TargetMessageInfo,
	): Promise<string> {
		return this.generateMediaReply(
			{ buffer: imageBuffer, mimeType },
			history,
			topicSummary,
			{
				instruction:
					"Analyze the photo and respond to the user's message/question, or make a natural, fitting comment about the photo in the context of the conversation.",
				replyDescription:
					"The reply you will write to the photo and the flow of the conversation.",
				fallbackEmpty: CONFIG.MESSAGES.gemini_empty_image_fallback,
				fallbackError: CONFIG.MESSAGES.gemini_error_image_fallback,
				mediaFallbackText: "[Photo]",
				onToolCall,
				onToolProgress,
				chatId,
				targetMessage,
			},
		);
	},

	async generateVoiceReply(
		audioBuffer: Buffer,
		mimeType: string,
		history: MessageRow[],
		topicSummary: string | null,
		onToolCall?: ToolCallCallback,
		chatId?: string,
		onToolProgress?: ToolProgressCallback,
		targetMessage?: TargetMessageInfo,
	): Promise<string> {
		return this.generateMediaReply(
			{ buffer: audioBuffer, mimeType },
			history,
			topicSummary,
			{
				instruction:
					"The user sent a voice message. Listen, understand what is being said, and answer in a friendly way suitable for the conversation.",
				replyDescription:
					"The reply you will write to the voice message and the flow of the conversation.",
				fallbackEmpty: "I heard the voice message but didn't know what to say.",
				fallbackError:
					"I got confused while listening to the voice message, can you try again?",
				mediaFallbackText: "[Voice]",
				onToolCall,
				onToolProgress,
				chatId,
				targetMessage,
			},
		);
	},

	transcribeAudio,
	describeImage,
};
