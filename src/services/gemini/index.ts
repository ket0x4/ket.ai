import { toolRegistry } from "../../agent/index";
import { CONFIG } from "../../config";
import type { MessageRow } from "../../db/repository";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { ToolTraceLogger } from "../../utils/toolTrace";
import { ai } from "./client";
import { getRelevantMemories, processNewMemory } from "./memory";
import {
	buildHistoryList,
	cleanUserText,
	getSystemInstruction,
	runWithRetry,
} from "./utils";

type ToolCallCallback = (
	toolName: string,
	args: Record<string, unknown>,
	step: number,
) => Promise<void> | void;

const lastSummarizedCount = new Map<string, number>();
const MAX_TRACKED_CHATS = 200;

interface GenerateResponseOptions {
	isSpontaneous?: boolean;
	instruction?: string;
	media?: { buffer: Buffer; mimeType: string };
	replyDescription: string;
	fallbackEmpty: string;
	fallbackError: string;
	mediaFallbackText: string;
	onToolCall?: ToolCallCallback;
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
	return `User: ${lastMsg.first_name || "Unnamed"}${suffix}`;
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
	const historyList = buildHistoryList(history);

	const inputPayload: Record<string, unknown> = {
		active_topic:
			topicSummary || "General chat is going on, no specific topic.",
		recent_messages: historyList,
		memories,
	};

	if (options.instruction) {
		inputPayload.instruction = options.instruction;
	} else {
		inputPayload.interaction_type = options.isSpontaneous
			? "spontaneous_comment"
			: "direct_reply";
		inputPayload.current_message_to_reply = options.isSpontaneous
			? undefined
			: {
					sender: resolveSenderDescription(lastMsg),
					text: lastMessageText,
				};
	}

	const hasExplicitMemoryIntent =
		/\b(?:bunu unutma|aklında tut|not et|hafızana yaz|kaydet|bunu hatırla)\b/i.test(
			lastMessageText,
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
					user_name: {
						type: "STRING",
						description:
							"The EXACT name of the user who stated the fact (look at the 'sender' field).",
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

async function notifyToolCallbacks(
	functionCalls: Array<{ name?: string; args?: Record<string, unknown> }>,
	step: number,
	onToolCall?: ToolCallCallback,
): Promise<void> {
	if (!onToolCall) return;
	for (const fc of functionCalls) {
		if (!fc?.name) continue;
		try {
			await onToolCall(fc.name, fc.args || {}, step);
		} catch (err) {
			logger.warn("[Agent] Error executing onToolCall callback:", err);
		}
	}
}

async function executeSingleTool(
	fc: { name?: string; args?: Record<string, unknown> },
	chatIdStr: string,
	step: number,
): Promise<Record<string, unknown> | null> {
	if (!fc?.name) return null;
	const name = fc.name;
	const args = fc.args || {};
	logger.info(`[Agent] Executing tool '${name}'...`);
	const startTime = Date.now();
	const result = await toolRegistry.executeTool(name, args);
	const durationMs = Date.now() - startTime;

	const snippet =
		typeof result === "string"
			? result.substring(0, 300)
			: JSON.stringify(result).substring(0, 300);
	ToolTraceLogger.add({
		chatId: chatIdStr,
		toolName: name,
		args,
		resultSnippet: snippet,
		executionTimeMs: durationMs,
		step,
	});

	return {
		functionResponse: {
			name,
			response: { result },
		},
	};
}

async function handleToolExecution(
	functionCalls: Array<{ name?: string; args?: Record<string, unknown> }>,
	chatIdStr: string,
	step: number,
	onToolCall?: ToolCallCallback,
): Promise<Array<Record<string, unknown>>> {
	await notifyToolCallbacks(functionCalls, step, onToolCall);

	const toolResponseParts: Array<Record<string, unknown>> = [];
	for (const fc of functionCalls) {
		const part = await executeSingleTool(fc, chatIdStr, step);
		if (part) toolResponseParts.push(part);
	}
	return toolResponseParts;
}

async function processExtractedMemories(
	chatIdStr: string,
	memoryUpdates: unknown[],
	senderUserId?: number,
): Promise<void> {
	if (!Array.isArray(memoryUpdates) || !chatIdStr) return;

	for (const mem of memoryUpdates as Array<{
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

		await processNewMemory(chatIdStr, combinedFact, {
			userId: senderUserId,
			category: cat,
			ttlDays: ttl,
		});
	}
}

async function runAgentStepLoop(
	contents: Array<Record<string, unknown>>,
	genConfig: Record<string, unknown>,
	chatIdStr: string,
	onToolCall?: ToolCallCallback,
): Promise<string> {
	let step = 0;
	let responseText = "";

	while (step < CONFIG.MAX_AGENT_STEPS) {
		step++;
		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects content structure
				contents: contents as any,
				// biome-ignore lint/suspicious/noExplicitAny: SDK expects config structure
				config: genConfig as any,
			}),
		);

		const rawParts = response.candidates?.[0]?.content?.parts as
			| Array<{
					functionCall?: {
						name?: string;
						args?: Record<string, unknown>;
					};
			  }>
			| undefined;
		const candidateCalls =
			response.functionCalls ||
			rawParts?.filter((p) => p.functionCall?.name).map((p) => p.functionCall);
		const functionCalls = (candidateCalls || []).filter(
			(
				fc,
			): fc is {
				name?: string;
				args?: Record<string, unknown>;
			} => Boolean(fc),
		);

		if (functionCalls.length > 0) {
			logger.info(
				`[Agent] Gemini requested ${functionCalls.length} tool call(s) at step ${step}`,
			);

			const modelContent = response.candidates?.[0]?.content;
			if (modelContent) {
				contents.push(modelContent as Record<string, unknown>);
			} else {
				contents.push({
					role: "model",
					parts: functionCalls.map((fc) => ({ functionCall: fc })),
				});
			}

			const toolParts = await handleToolExecution(
				functionCalls,
				chatIdStr,
				step,
				onToolCall,
			);
			contents.push({ role: "user", parts: toolParts });
			continue;
		}

		responseText = response.text?.trim() || "";
		break;
	}
	return responseText;
}

function buildGenConfig(
	options: GenerateResponseOptions,
	toolsConfig?: Array<Record<string, unknown>>,
): Record<string, unknown> {
	const genConfig: Record<string, unknown> = {
		systemInstruction: getSystemInstruction(),
		temperature: options.media ? 0.8 : 0.85,
		maxOutputTokens: 350,
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

async function parseAndProcessReply(
	responseText: string,
	chatIdStr: string,
	lastMsg?: MessageRow,
): Promise<string> {
	try {
		const cleanedText = responseText
			.replace(/^```(?:json)?\n?|\n?```$/g, "")
			.trim();
		const parsed = JSON.parse(cleanedText);

		const senderUserId =
			lastMsg && !lastMsg.is_bot_reply ? lastMsg.user_id : undefined;
		await processExtractedMemories(
			chatIdStr,
			parsed.new_memory_updates,
			senderUserId,
		);

		return parsed.reply || responseText;
	} catch {
		return responseText;
	}
}

export const GeminiService = {
	async _generateResponse(
		history: MessageRow[],
		topicSummary: string | null,
		options: GenerateResponseOptions,
	): Promise<string> {
		try {
			if (history.length === 0) {
				logger.warn(
					"[Gemini] _generateResponse called with empty history. Returning fallback.",
				);
				return options.fallbackEmpty;
			}
			const chatIdStr = history[0]?.chat_id.toString() || "";
			const lastMsg = history[history.length - 1];
			const lastMessageText = resolveLastMessageText(
				lastMsg,
				options.mediaFallbackText,
			);

			const queryForMemory = options.isSpontaneous
				? topicSummary || "General chat"
				: lastMessageText;
			const memories = chatIdStr
				? await getRelevantMemories(
						chatIdStr,
						queryForMemory,
						topicSummary || undefined,
					)
				: [];

			const inputPayload = buildInputPayload(
				history,
				topicSummary,
				options,
				memories,
			);
			const contents = buildInitialContents(inputPayload, options.media);

			const toolsConfig =
				CONFIG.ENABLE_WEB_SEARCH && toolRegistry.count > 0
					? [
							{
								functionDeclarations: toolRegistry.getFunctionDeclarations(),
							},
						]
					: undefined;

			const genConfig = buildGenConfig(options, toolsConfig);

			const responseText = await runAgentStepLoop(
				contents,
				genConfig,
				chatIdStr,
				options.onToolCall,
			);

			const reply = await parseAndProcessReply(
				responseText,
				chatIdStr,
				lastMsg,
			);
			return reply || options.fallbackEmpty;
		} catch (error) {
			logger.error("Error in Gemini _generateResponse:", error);
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
	): Promise<string> {
		return this._generateResponse(history, topicSummary, {
			isSpontaneous,
			replyDescription:
				"The reply you will write to the chat. A short (1-2 sentences).",
			fallbackEmpty: CONFIG.MESSAGES.gemini_empty_reply_fallback,
			fallbackError: CONFIG.MESSAGES.gemini_error_reply_fallback,
			mediaFallbackText: "[Media]",
			onToolCall,
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

			const response = await runWithRetry(() =>
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
						maxOutputTokens: 100,
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
			);

			const responseText = response.text?.trim() || "";
			try {
				const parsed = JSON.parse(responseText);
				return parsed.summary || "";
			} catch {
				return responseText;
			}
		} catch (error) {
			logger.error("Error in Gemini summarizeTopic:", error);
			return "";
		}
	},

	async generateImageReply(
		imageBuffer: Buffer,
		mimeType: string,
		history: MessageRow[],
		topicSummary: string | null,
		onToolCall?: ToolCallCallback,
	): Promise<string> {
		return this._generateResponse(history, topicSummary, {
			instruction:
				"Analyze the photo and make a comment suitable for this photo.",
			media: { buffer: imageBuffer, mimeType },
			replyDescription:
				"The reply you will write to the photo and the flow of the conversation.",
			fallbackEmpty: CONFIG.MESSAGES.gemini_empty_image_fallback,
			fallbackError: CONFIG.MESSAGES.gemini_error_image_fallback,
			mediaFallbackText: "[Photo]",
			onToolCall,
		});
	},

	async generateVoiceReply(
		audioBuffer: Buffer,
		mimeType: string,
		history: MessageRow[],
		topicSummary: string | null,
		onToolCall?: ToolCallCallback,
	): Promise<string> {
		return this._generateResponse(history, topicSummary, {
			instruction:
				"The user sent a voice message. Listen, understand what is being said, and answer in a friendly way suitable for the conversation.",
			media: { buffer: audioBuffer, mimeType },
			replyDescription:
				"The reply you will write to the voice message and the flow of the conversation.",
			fallbackEmpty: "I heard the voice message but didn't know what to say.",
			fallbackError:
				"I got confused while listening to the voice message, can you try again?",
			mediaFallbackText: "[Voice]",
			onToolCall,
		});
	},
};
