import type { Bot } from "grammy";
import { CONFIG } from "../../config/index";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { botUsername } from "./instance";

interface OutgoingMessageInfo {
	chatId: string;
	msgId: number;
	text: string;
	sentAt: number;
	replyToMessageId?: number;
}

function saveOutgoingMessage(
	chatId: string,
	msgId: number,
	text: string,
	sentAt?: number,
	replyToMessageId?: number,
) {
	Repository.saveMessage({
		chatId,
		messageId: msgId,
		userId: 0,
		username: botUsername || "ket",
		firstName: "ket.ai",
		text,
		replyToMessageId,
		isBotReply: true,
		sentAt: sentAt || Math.floor(Date.now() / 1000),
	});
}

const TRANSIENT_STATUS_REGEX = /^(?:🔍|⚡|📦|📄|✏️|📤|📁|🧹|Spawning subagent)/u;

function isTransientStatusMessage(text: string): boolean {
	if (!text) return false;
	const trimmed = text.trim();
	return (
		trimmed === CONFIG.MESSAGES.tool_status_web_search ||
		TRANSIENT_STATUS_REGEX.test(trimmed) ||
		trimmed.includes("────────────────────────")
	);
}

function resolveMediaFallbackText(method: string): string {
	switch (method) {
		case "sendPhoto":
			return "[Photo]";
		case "sendVoice":
			return "[Voice]";
		case "sendAudio":
			return "[Audio]";
		case "sendDocument":
			return "[Document]";
		case "sendVideo":
			return "[Video]";
		case "sendMediaGroup":
			return "[Media]";
		default:
			return "";
	}
}

function extractOutgoingText(
	payloadRecord: Record<string, unknown>,
	innerResult?: Record<string, unknown>,
	method = "sendMessage",
): string {
	if (typeof payloadRecord.text === "string") return payloadRecord.text;
	if (typeof payloadRecord.caption === "string") return payloadRecord.caption;
	if (typeof innerResult?.text === "string") return innerResult.text;
	if (typeof innerResult?.caption === "string") return innerResult.caption;
	return resolveMediaFallbackText(method);
}

function extractReplyToId(
	payloadRecord: Record<string, unknown>,
	innerResult?: Record<string, unknown>,
): number | undefined {
	const replyParams = payloadRecord.reply_parameters as
		| Record<string, unknown>
		| undefined;
	const replyToMsg = innerResult?.reply_to_message as
		| Record<string, unknown>
		| undefined;

	return (
		(payloadRecord.reply_to_message_id as number) ||
		(replyParams?.message_id as number) ||
		(replyToMsg?.message_id as number) ||
		undefined
	);
}

const SUPPORTED_OUTGOING_METHODS = new Set([
	"sendMessage",
	"editMessageText",
	"sendPhoto",
	"sendDocument",
	"sendVoice",
	"sendAudio",
	"sendVideo",
	"sendMediaGroup",
]);

function extractOutgoingPayload(
	method: string,
	payload: unknown,
	result: unknown,
): OutgoingMessageInfo | null {
	if (!SUPPORTED_OUTGOING_METHODS.has(method)) return null;
	if (!payload || typeof payload !== "object") return null;

	const payloadRecord = payload as Record<string, unknown>;
	const chatId = String(payloadRecord.chat_id ?? "");
	if (!chatId) return null;

	// For sendMediaGroup, result is an array of messages
	const primaryMsg = Array.isArray(result)
		? (result[0] as Record<string, unknown> | undefined)
		: undefined;

	const resultRecord =
		typeof result === "object" && result !== null
			? (result as Record<string, unknown>)
			: undefined;
	const innerResult =
		primaryMsg ||
		(resultRecord &&
		typeof resultRecord.result === "object" &&
		resultRecord.result !== null
			? (resultRecord.result as Record<string, unknown>)
			: resultRecord);

	const msgId =
		(payloadRecord.message_id as number) ||
		(innerResult?.message_id as number) ||
		(resultRecord?.message_id as number);
	if (!msgId) return null;

	const text = extractOutgoingText(payloadRecord, innerResult, method);
	if (isTransientStatusMessage(text)) return null;

	const sentAt =
		(innerResult?.date as number) ||
		(resultRecord?.date as number) ||
		Math.floor(Date.now() / 1000);

	const replyToMessageId = extractReplyToId(payloadRecord, innerResult);

	return {
		chatId,
		msgId,
		text,
		sentAt,
		replyToMessageId,
	};
}

function archiveOutgoingMessage(
	method: string,
	payload: unknown,
	result: unknown,
): void {
	try {
		const extracted = extractOutgoingPayload(method, payload, result);
		if (!extracted) return;
		const { chatId, msgId, text, sentAt, replyToMessageId } = extracted;

		if (method === "editMessageText") {
			const updated = Repository.updateMessageText(chatId, msgId, text);
			if (!updated) {
				saveOutgoingMessage(chatId, msgId, text, sentAt, replyToMessageId);
			}
		} else {
			saveOutgoingMessage(chatId, msgId, text, sentAt, replyToMessageId);
		}
	} catch (e) {
		logger.error("[Bot Outgoing Logger] Failed to archive bot reply:", e);
	}
}

/**
 * Installs a grammY transformer that syncs outgoing sendMessage/editMessageText
 * and deleteMessage API calls into the SQLite history.
 */
export function installOutgoingArchiveInterceptor(bot: Bot): void {
	bot.api.config.use(async (prev, method, payload, signal) => {
		const result = await prev(method, payload, signal);
		if (method === "deleteMessage" && payload && typeof payload === "object") {
			const payloadRecord = payload as Record<string, unknown>;
			const chatId = String(payloadRecord.chat_id ?? "");
			const msgId = Number(payloadRecord.message_id ?? 0);
			if (chatId && msgId) {
				Repository.deleteMessage(chatId, msgId);
			}
		} else {
			archiveOutgoingMessage(method, payload, result);
		}
		return result;
	});
}
