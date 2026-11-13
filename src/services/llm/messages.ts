import { CONFIG } from "../../config";
import type { MessageRow } from "../../db/repository";
import { cleanUserText, resolveMessageFallback } from "../../utils/text";
import { botUsername } from "../bot/instance";
import type { RetrievedMemory } from "../memory/memory";
import type { PreparedDocumentContext } from "../perception/documentPerception";
import type {
	ChatMessage,
	GenerateResponseOptions,
	TargetMessageInfo,
} from "./types";

const BOT_SENDER_TAG = "ket.ai (assistant)";

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

export function resolveLastMessageText(
	lastMsg: MessageRow | undefined,
	mediaFallback: string,
): string {
	if (!lastMsg) return mediaFallback;
	if (lastMsg.is_bot_reply) return lastMsg.text || mediaFallback;
	return cleanUserText(lastMsg.text, botUsername) || mediaFallback;
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
		const target: TargetMessageInfo = options.targetMessage;
		const senderTag = formatUserSenderTag(
			target.userName,
			target.userId,
			target.userUsername,
		);
		const text =
			cleanUserText(target.text, botUsername) || options.mediaFallbackText;
		let content = `${senderTag}: ${text}`;
		if (target.replyTo) {
			const replySender = target.replyTo.isBot
				? BOT_SENDER_TAG
				: formatUserSenderTag(
						target.replyTo.senderName,
						target.replyTo.senderId,
						target.replyTo.senderUsername,
					);
			const preview = formatParentPreviewText(target.replyTo.text);
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

/** Builds the full ChatMessage[] prompt payload for the current turn. */
export function buildConversationalMessages(
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

export function buildConversationalContextSections(
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

export function shouldEnableToolsForTurn(
	options: GenerateResponseOptions,
): boolean {
	return !options.isSpontaneous;
}

export interface MediaFallbacks {
	instruction?: string;
	fallbackEmpty: string;
	fallbackError: string;
	mediaFallbackText: string;
}

export function resolveMediaFallbacks(
	document?: PreparedDocumentContext,
	effectiveMedia?: { buffer: Buffer; mimeType: string },
): MediaFallbacks {
	if (document) {
		return {
			instruction: `The user is referring to or asking about the document '${document.fileName}'. It is saved in your sandbox workspace. Inspect, run (via execute_code), edit/modify (via write_workspace_file/send_workspace_file), or summarize it according to the user's message.`,
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
				fallbackEmpty: "I listened to the audio, but didn't know what to say.",
				fallbackError: "Couldn't process the audio, please try again.",
				mediaFallbackText: "[Audio]",
			};
		}
		return {
			instruction:
				"The user is referring to or asking about the attached photo. Analyze the photo and answer their message/question, or make a natural, fitting comment about the photo in the context of the conversation.",
			fallbackEmpty: CONFIG.MESSAGES.empty_image_fallback,
			fallbackError: CONFIG.MESSAGES.error_image_fallback,
			mediaFallbackText: "[Photo]",
		};
	}

	return {
		instruction: undefined,
		fallbackEmpty: CONFIG.MESSAGES.empty_reply_fallback,
		fallbackError: CONFIG.MESSAGES.error_reply_fallback,
		mediaFallbackText: "[Media]",
	};
}
