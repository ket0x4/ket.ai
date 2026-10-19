import { existsSync, readFileSync } from "node:fs";
import { CONFIG } from "../../config";
import { type MessageRow, Repository } from "../../db/repository";
import logger from "../../utils/logger";

const SYSTEM_PROMPT_FILE = "system.txt";

let cachedSystemPrompt = "";

function loadSystemPrompt(): string {
	if (!existsSync(SYSTEM_PROMPT_FILE)) {
		if (process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test") {
			return "You are ket.ai, a helpful AI assistant.";
		}
		logger.error(
			"FATAL: system.txt not found! Bot cannot function without a system prompt.",
		);
		process.exit(1);
	}
	try {
		return readFileSync(SYSTEM_PROMPT_FILE, "utf-8").trim();
	} catch (e) {
		logger.error("FATAL: Error reading system.txt:", e);
		process.exit(1);
	}
}

// Load once at module initialization
cachedSystemPrompt = loadSystemPrompt();

function buildToolAvailabilityRule(enabledTools: Iterable<string>): string {
	const list = [...new Set(enabledTools)];
	const available = list.length
		? list.map((t) => `\`${t}\``).join(", ")
		: "none";
	return `\n\n### ACTIVE TOOLS (authoritative) ###\nToday's date: ${new Date().toISOString().slice(0, 10)} (UTC). Enabled tools: ${available}. Never claim to use a tool not in this list.`;
}

export function getSystemInstruction(
	personaPrompt?: string,
	enabledTools?: Iterable<string>,
	contextSections?: string[],
): string {
	const sections = [
		cachedSystemPrompt,
		enabledTools
			? buildToolAvailabilityRule(enabledTools)
			: `\n\nToday's date: ${new Date().toISOString().slice(0, 10)} (UTC).`,
	];
	if (contextSections && contextSections.length > 0) {
		for (const section of contextSections) {
			if (section.trim()) {
				sections.push(`\n\n${section.trim()}`);
			}
		}
	}
	const base = sections.join("");

	if (!personaPrompt?.trim()) {
		return base;
	}
	return `${base}\n\n### ACTIVE PERSONA ###\n${personaPrompt.trim()}`;
}

// Matches emoji bases (\p{Extended_Pictographic}), regional-indicator flags,
// variation selectors, skin-tone modifiers, ZWJ joins, and keycap combiners.
const EMOJI_REGEX =
	/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Variation_Selector}|\u{1F3FB}|\u{1F3FC}|\u{1F3FD}|\u{1F3FE}|\u{1F3FF}|\u{200D}|\u{20E3})/gu;

/**
 * Removes emoji and pictographic characters from a reply so the no-emoji rule
 * is enforced deterministically instead of relying on the prompt alone.
 */
export function stripEmoji(text: string): string {
	if (!text) return text;
	return text.replace(EMOJI_REGEX, "");
}

function isGemma4Model(lower: string): boolean {
	return lower.includes("gemma-4");
}

function getGemma4ThinkingConfig(isAgentic: boolean): Record<string, unknown> {
	return { thinkingLevel: isAgentic ? "MEDIUM" : "MINIMAL" };
}

function getAgenticThinkingConfig(lower: string): Record<string, unknown> {
	if (lower.includes("3") || lower.includes("gemini-3")) {
		return { thinkingLevel: "LOW" };
	}
	if (lower.includes("2.5") && lower.includes("pro")) {
		return { thinkingBudget: 1024 };
	}
	return { thinkingBudget: 512 };
}

function getDefaultThinkingConfig(lower: string): Record<string, unknown> {
	if (lower.includes("2.5") && lower.includes("pro")) {
		return { thinkingBudget: 128 };
	}
	if (lower.includes("3") || lower.includes("gemini-3")) {
		return { thinkingLevel: "MINIMAL" };
	}
	return { thinkingBudget: 0 };
}

/**
 * Returns thinkingConfig. Uses minimal thinking on single-shot chat turns and
 * a bounded reasoning budget on multi-step tool turns.
 */
export function getThinkingConfig(
	modelName: string = CONFIG.GEMINI_MODEL,
	options?: { isAgentic?: boolean },
): Record<string, unknown> | undefined {
	const lower = (modelName || "").toLowerCase();
	const isAgentic = Boolean(options?.isAgentic && CONFIG.ENABLE_AGENT_THINKING);

	if (isGemma4Model(lower)) {
		return getGemma4ThinkingConfig(isAgentic);
	}
	if (isAgentic) {
		return getAgenticThinkingConfig(lower);
	}
	return getDefaultThinkingConfig(lower);
}

function parseDetailsDelay(error: unknown): number | null {
	// biome-ignore lint/suspicious/noExplicitAny: error details can be nested
	const errorObj: any = error;
	const details = errorObj?.error?.details || errorObj?.details;
	if (!Array.isArray(details)) return null;

	for (const d of details) {
		if (d?.retryDelay) {
			const match = String(d.retryDelay).match(/^([0-9.]+)\s*s?$/i);
			if (match?.[1]) {
				const seconds = Number.parseFloat(match[1]);
				if (!Number.isNaN(seconds) && seconds > 0) {
					return Math.ceil(seconds * 1000) + 500;
				}
			}
		}
	}
	return null;
}

function parseTextDelay(str: string): number | null {
	const match =
		str.match(/retry\s+in\s+([0-9.]+)\s*s/i) ||
		str.match(/retry\s+after\s+([0-9.]+)\s*s?/i);
	if (!match?.[1]) return null;

	const seconds = Number.parseFloat(match[1]);
	if (!Number.isNaN(seconds) && seconds > 0) {
		return Math.ceil(seconds * 1000) + 500;
	}
	return null;
}

function tryParseJsonObject(raw: unknown): unknown {
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}
	if (raw instanceof Error && raw.message) {
		try {
			return JSON.parse(raw.message);
		} catch {
			return null;
		}
	}
	return raw;
}

/**
 * Extracts recommended retry delay in milliseconds from Gemini API errors or error messages.
 * @internal
 */
function extractRetryDelayMs(error: unknown): number | null {
	if (!error) return null;

	const parsedObj = tryParseJsonObject(error);
	const detailsDelay = parseDetailsDelay(parsedObj || error);
	if (detailsDelay !== null) return detailsDelay;

	const str =
		typeof error === "string"
			? error
			: error instanceof Error
				? error.message
				: String(error);
	return parseTextDelay(str);
}

type GeminiLimiterBucket = "default" | "embedding" | "transcribe";

interface ScheduleOptions {
	customIntervalMs?: number;
}

interface RunWithRetryOptions {
	retries?: number;
	baseDelayMs?: number;
	customIntervalMs?: number;
	bucket?: GeminiLimiterBucket;
}

class GeminiRateLimiter {
	private lastRequestEndTime = 0;
	private queue: Promise<void> = Promise.resolve();

	constructor(private readonly defaultIntervalFn: () => number) {}

	public async schedule<T>(
		fn: () => Promise<T>,
		optionsOrInterval?: number | ScheduleOptions,
	): Promise<T> {
		const isTestEnv =
			process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
		const customIntervalMs =
			typeof optionsOrInterval === "number"
				? optionsOrInterval
				: optionsOrInterval?.customIntervalMs;

		const interval =
			customIntervalMs ?? (isTestEnv ? 0 : this.defaultIntervalFn());

		const run = async () => {
			const elapsed = Date.now() - this.lastRequestEndTime;
			if (interval > 0 && this.lastRequestEndTime > 0 && elapsed < interval) {
				await new Promise((r) => setTimeout(r, interval - elapsed));
			}
			try {
				return await fn();
			} finally {
				this.lastRequestEndTime = Date.now();
			}
		};

		const result = this.queue.then(run, run);
		this.queue = result.then(
			() => {},
			() => {},
		);
		return result;
	}
}

const rateLimiters: Record<GeminiLimiterBucket, GeminiRateLimiter> = {
	default: new GeminiRateLimiter(
		() => CONFIG.GEMINI_MIN_REQUEST_INTERVAL_MS ?? 3500,
	),
	embedding: new GeminiRateLimiter(() => 100),
	transcribe: new GeminiRateLimiter(() => 500),
};

function parseRetryOptions(
	retriesOrOptions: number | RunWithRetryOptions,
	baseDelayMs: number,
): {
	retries: number;
	currentDelayMs: number;
	customIntervalMs?: number;
	bucket: GeminiLimiterBucket;
} {
	let retries = 4;
	let currentDelayMs = baseDelayMs;
	let customIntervalMs: number | undefined;
	let bucket: GeminiLimiterBucket = "default";

	if (typeof retriesOrOptions === "number") {
		retries = retriesOrOptions;
	} else if (
		typeof retriesOrOptions === "object" &&
		retriesOrOptions !== null
	) {
		if (retriesOrOptions.retries !== undefined) {
			retries = retriesOrOptions.retries;
		}
		if (retriesOrOptions.baseDelayMs !== undefined) {
			currentDelayMs = retriesOrOptions.baseDelayMs;
		}
		if (retriesOrOptions.customIntervalMs !== undefined) {
			customIntervalMs = retriesOrOptions.customIntervalMs;
		}
		if (retriesOrOptions.bucket !== undefined) {
			bucket = retriesOrOptions.bucket;
		}
	}

	return { retries, currentDelayMs, customIntervalMs, bucket };
}

function isTransientError(error: unknown): boolean {
	const err = error as { message?: string; status?: number } | null;
	const errorMessage = err?.message || String(error);
	const status = err?.status || 0;

	// 429 = rate limited; any 5xx = server overload / dependency failure.
	// Google's guidance is to retry both with exponential backoff.
	return (
		status === 429 ||
		status >= 500 ||
		errorMessage.includes("429") ||
		errorMessage.includes("503") ||
		errorMessage.includes("UNAVAILABLE") ||
		errorMessage.includes("RESOURCE_EXHAUSTED") ||
		errorMessage.includes("INTERNAL") ||
		errorMessage.includes("high demand") ||
		errorMessage.includes("Quota exceeded")
	);
}

export async function runWithRetry<T>(
	fn: () => Promise<T>,
	retriesOrOptions: number | RunWithRetryOptions = 4,
	baseDelayMs = 5000,
): Promise<T> {
	const options = parseRetryOptions(retriesOrOptions, baseDelayMs);
	const limiter = rateLimiters[options.bucket] ?? rateLimiters.default;
	let currentDelayMs = options.currentDelayMs;
	let lastError: unknown;

	for (let i = 0; i < options.retries; i++) {
		try {
			return await limiter.schedule(fn, {
				customIntervalMs: options.customIntervalMs,
			});
		} catch (error) {
			lastError = error;

			if (isTransientError(error) && i < options.retries - 1) {
				const serverDelayMs = extractRetryDelayMs(error);
				const waitMs =
					serverDelayMs ?? currentDelayMs + Math.floor(Math.random() * 500);

				logger.warn(
					`[Gemini:${options.bucket}] Rate limit / transient error (Attempt ${i + 1}/${options.retries}). Waiting ${waitMs}ms before retry...`,
				);
				await new Promise((resolve) => setTimeout(resolve, waitMs));
				currentDelayMs += 5000;
			} else {
				throw error;
			}
		}
	}
	throw lastError;
}

export function cleanUserText(
	text: string | null,
	botUsernameOverride?: string,
): string {
	if (!text) return "";
	const names = new Set<string>(["ket"]);
	if (botUsernameOverride?.trim()) {
		names.add(botUsernameOverride.trim());
	}
	const escapedNames = Array.from(names)
		.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("|");

	const regex = new RegExp(`(^|\\s)@?(?:${escapedNames})\\b`, "gi");
	return text.replace(regex, " ").replace(/\s+/g, " ").trim();
}

export function resolveMessageFallback(msg: MessageRow): string {
	if (msg.photo_file_id) return "[Photo]";
	if (msg.document_file_id) {
		return `[Document: ${msg.document_file_name || "file"}]`;
	}
	return "[Media]";
}

function resolveMessageSender(msg: MessageRow): string {
	if (msg.is_bot_reply) return "You (ket.ai)";
	const usernameSuffix = msg.username ? ` (@${msg.username})` : "";
	return `User_${msg.user_id} (${msg.first_name || "Unnamed"}${usernameSuffix})`;
}

function formatParentPreview(sender: string, rawText?: string | null): string {
	const text = rawText
		? rawText.length > 50
			? `${rawText.slice(0, 47)}...`
			: rawText
		: "[Media]";
	return `${sender}: "${text}"`;
}

function resolveReplyPreview(
	replyToId: number,
	msgMap: Map<number, MessageRow>,
	chatId?: string,
): string | undefined {
	const parent = msgMap.get(replyToId);
	if (parent) {
		const sender = parent.is_bot_reply
			? "You (ket.ai)"
			: parent.first_name || "User";
		return formatParentPreview(sender, parent.text);
	}

	if (chatId) {
		const dbParent = Repository.getMessageWithUser(chatId, replyToId);
		if (dbParent) {
			const sender = dbParent.is_bot_reply
				? "You (ket.ai)"
				: dbParent.first_name || "User";
			return formatParentPreview(sender, dbParent.text);
		}
	}

	return undefined;
}

export function buildHistoryList(
	history: MessageRow[],
	botUsernameOverride?: string,
	chatId?: string,
) {
	const msgMap = new Map<number, MessageRow>();
	for (const m of history) {
		msgMap.set(m.message_id, m);
	}

	return history.map((msg) => {
		const fallback = resolveMessageFallback(msg);
		const sender = resolveMessageSender(msg);
		const replyPreview = msg.reply_to_message_id
			? resolveReplyPreview(msg.reply_to_message_id, msgMap, chatId)
			: undefined;

		const cleanText = msg.is_bot_reply
			? msg.text || fallback
			: cleanUserText(msg.text, botUsernameOverride) || fallback;

		return {
			sender,
			...(replyPreview && { reply_to: replyPreview }),
			text: cleanText,
		};
	});
}

/**
 * Resolves target Telegram user_id by matching name against recent chat message history or SQLite database.
 * If userName is about someone else and that person is not found, returns null (rather than wrongly attributing
 * the fact to the speaker).
 */
export function resolveTargetUserId(
	userName: string,
	explicitUserId?: number,
	history: MessageRow[] = [],
	fallbackUserId?: number,
	senderFirstName?: string,
	senderUsername?: string,
): number | null {
	if (typeof explicitUserId === "number" && explicitUserId > 0) {
		return explicitUserId;
	}

	if (!userName?.trim()) {
		return fallbackUserId ?? null;
	}

	const cleanName = userName.toLowerCase().trim();

	const isSelf =
		cleanName === "me" ||
		cleanName === "myself" ||
		cleanName === "ben" ||
		cleanName === "kendim" ||
		cleanName === "kendisi" ||
		(senderFirstName && senderFirstName.toLowerCase().trim() === cleanName) ||
		(senderUsername && senderUsername.toLowerCase().trim() === cleanName);

	if (isSelf && typeof fallbackUserId === "number" && fallbackUserId > 0) {
		return fallbackUserId;
	}

	if (history.length > 0) {
		const matchedMsg = history
			.slice()
			.reverse()
			.find(
				(m) =>
					!m.is_bot_reply &&
					(m.first_name?.toLowerCase().trim() === cleanName ||
						m.first_name?.toLowerCase().trim().startsWith(cleanName) ||
						m.username?.toLowerCase().trim() === cleanName),
			);
		if (matchedMsg) {
			return matchedMsg.user_id;
		}
	}

	const dbUser = Repository.getUserByName(cleanName);
	if (dbUser) {
		return dbUser.user_id;
	}

	// If userName was explicitly provided and clearly not the sender, DO NOT pollute sender's profile.
	// Return null so the memory is stored as a general group memory.
	return null;
}

const ANAPHORIC_TRIGGERS =
	/\b(?:o|onun|ona|onlar|orası|oraya|oradan|orada|burası|buraya|neredeydi|nerede|kimdi|kimin|neydi|nedir|ne zaman|hangisi|bu|bunu|bunun|buna|şu|şunu|bahsettiğin|bahsettiği|dediğin|dediği|bahsettiğimiz|what|where|who|when|which|it|that|there|they|him|her)\b/i;

/**
 * Enriches a RAG retrieval query with recent conversational context if anaphora/pronouns or short questions are detected.
 */
export function expandContextualQuery(
	query: string,
	history: MessageRow[] = [],
	activeTopic?: string,
): string {
	const cleanQuery = query.trim();
	const isAnaphoric = ANAPHORIC_TRIGGERS.test(cleanQuery);
	const isVeryShort = cleanQuery.split(/\s+/).length <= 4;

	let contextSnippet = "";
	if ((isAnaphoric || isVeryShort) && history.length > 0) {
		const recentUserMsgs = history
			.slice(-4)
			.filter((m) => !m.is_bot_reply && m.text?.trim())
			.map((m) => cleanUserText(m.text))
			.filter((t) => t && t !== cleanQuery);

		if (recentUserMsgs.length > 0) {
			contextSnippet = recentUserMsgs.slice(-2).join(" ");
		}
	}

	const parts: string[] = [];
	if (contextSnippet) {
		parts.push(contextSnippet);
	}
	if (cleanQuery) {
		parts.push(cleanQuery);
	}
	if (
		activeTopic &&
		activeTopic !== "General chat is going on, no specific topic."
	) {
		parts.push(`Topic: ${activeTopic}`);
	}

	return parts.join(" | ") || cleanQuery;
}
