import { existsSync, readFileSync } from "node:fs";
import { CONFIG } from "../../config";
import type { MessageRow } from "../../db/repository";
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

const NO_EMOJI_RULE =
	"\n\n### FORMATTING RULE ###\nNever use emojis or emoticons in your responses. Always respond in clean, modern, natural, plain text format.";

export function getSystemInstruction(personaPrompt?: string): string {
	const base = `${cachedSystemPrompt}${NO_EMOJI_RULE}`;
	if (!personaPrompt?.trim()) {
		return base;
	}
	return `${base}\n\n### ACTIVE PERSONA INSTRUCTION ###\n${personaPrompt.trim()}\nStrictly adhere to this persona's tone, character, style, and rules in all replies. Never use emojis in your responses.`;
}

/**
 * Returns thinkingConfig to minimize or turn off reasoning tokens for models,
 * preventing thinking tokens from consuming latency and maxOutputTokens budget.
 */
export function getThinkingConfig(
	modelName: string = CONFIG.GEMINI_MODEL,
): Record<string, unknown> | undefined {
	const lower = (modelName || "").toLowerCase();

	// Gemini 2.5 Pro requires a minimum thinking budget of 128 (0 throws an error)
	if (lower.includes("2.5") && lower.includes("pro")) {
		return { thinkingBudget: 128 };
	}

	// Gemini 3 Pro
	if (lower.includes("3") && lower.includes("pro")) {
		return { thinkingLevel: "LOW" };
	}

	// Gemini 3 Flash / Lite
	if (lower.includes("3") || lower.includes("gemini-3")) {
		return { thinkingLevel: "MINIMAL" };
	}

	// For Gemini 2.5 Flash, 2.0 Flash, etc., turn thinking OFF (budget: 0)
	return { thinkingBudget: 0 };
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
export function extractRetryDelayMs(error: unknown): number | null {
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

export type RequestPriority = "high" | "low";

interface ScheduleOptions {
	priority?: RequestPriority;
	customIntervalMs?: number;
}

interface RunWithRetryOptions {
	retries?: number;
	baseDelayMs?: number;
	priority?: RequestPriority;
	customIntervalMs?: number;
}

interface QueuedTask<T = unknown> {
	fn: () => Promise<T>;
	customIntervalMs?: number;
	priority: RequestPriority;
	resolve: (value: T | PromiseLike<T>) => void;
	// biome-ignore lint/suspicious/noExplicitAny: rejection reason can be any error
	reject: (reason?: any) => void;
}

function parseScheduleOptions(optionsOrInterval?: number | ScheduleOptions): {
	priority: RequestPriority;
	customIntervalMs?: number;
} {
	let priority: RequestPriority = "high";
	let customIntervalMs: number | undefined;

	if (typeof optionsOrInterval === "number") {
		customIntervalMs = optionsOrInterval;
	} else if (
		typeof optionsOrInterval === "object" &&
		optionsOrInterval !== null
	) {
		if (optionsOrInterval.priority) priority = optionsOrInterval.priority;
		if (optionsOrInterval.customIntervalMs !== undefined) {
			customIntervalMs = optionsOrInterval.customIntervalMs;
		}
	}
	return { priority, customIntervalMs };
}

/**
 * Pacing rate limiter to enforce minimum time interval between consecutive Gemini API requests,
 * utilizing a two-tier priority queue (high for user-facing interactions, low for background tasks).
 * @internal
 */
export class GeminiRateLimiter {
	private lastRequestEndTime = 0;
	private minIntervalMs: number;
	private highPriorityQueue: QueuedTask[] = [];
	private lowPriorityQueue: QueuedTask[] = [];
	private isProcessing = false;

	constructor(minIntervalMs = 3500) {
		this.minIntervalMs = minIntervalMs;
	}

	public setMinInterval(ms: number): void {
		this.minIntervalMs = ms;
	}

	public getQueueLength(): { high: number; low: number; total: number } {
		return {
			high: this.highPriorityQueue.length,
			low: this.lowPriorityQueue.length,
			total: this.highPriorityQueue.length + this.lowPriorityQueue.length,
		};
	}

	public clearQueue(rejectReason?: string): void {
		const reason = new Error(rejectReason || "Queue cleared");
		for (const task of this.highPriorityQueue) {
			task.reject(reason);
		}
		for (const task of this.lowPriorityQueue) {
			task.reject(reason);
		}
		this.highPriorityQueue = [];
		this.lowPriorityQueue = [];
	}

	public async schedule<T>(
		fn: () => Promise<T>,
		optionsOrInterval?: number | ScheduleOptions,
	): Promise<T> {
		const { priority, customIntervalMs } =
			parseScheduleOptions(optionsOrInterval);

		return new Promise<T>((resolve, reject) => {
			const task: QueuedTask<T> = {
				fn,
				customIntervalMs,
				priority,
				resolve: resolve as (value: unknown) => void,
				reject,
			};

			if (priority === "high") {
				this.highPriorityQueue.push(task as QueuedTask);
			} else {
				this.lowPriorityQueue.push(task as QueuedTask);
			}

			this.processQueue();
		});
	}

	private enforcePacingDelay(candidate: QueuedTask): Promise<void> | null {
		const isTestEnv =
			process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
		const interval =
			candidate.customIntervalMs ??
			(isTestEnv
				? 0
				: (CONFIG.GEMINI_MIN_REQUEST_INTERVAL_MS ?? this.minIntervalMs));

		const now = Date.now();
		const elapsed = now - this.lastRequestEndTime;

		if (interval > 0 && this.lastRequestEndTime > 0 && elapsed < interval) {
			const waitMs = interval - elapsed;
			logger.debug(
				`[RateLimiter] Enforcing ${waitMs}ms artificial pacing delay before Gemini request (${candidate.priority} priority)...`,
			);
			return new Promise((r) => setTimeout(r, waitMs));
		}
		return null;
	}

	private async executeTask(task: QueuedTask): Promise<void> {
		try {
			const result = await task.fn();
			this.lastRequestEndTime = Date.now();
			task.resolve(result);
		} catch (err) {
			this.lastRequestEndTime = Date.now();
			task.reject(err);
		}
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;

		try {
			while (
				this.highPriorityQueue.length > 0 ||
				this.lowPriorityQueue.length > 0
			) {
				const nextCandidate =
					this.highPriorityQueue[0] || this.lowPriorityQueue[0];
				if (!nextCandidate) break;

				const pacingPromise = this.enforcePacingDelay(nextCandidate);
				if (pacingPromise) {
					await pacingPromise;
				}

				const task =
					this.highPriorityQueue.shift() || this.lowPriorityQueue.shift();
				if (!task) continue;

				await this.executeTask(task);
			}
		} finally {
			this.isProcessing = false;
			if (
				this.highPriorityQueue.length > 0 ||
				this.lowPriorityQueue.length > 0
			) {
				this.processQueue();
			}
		}
	}
}

const geminiRateLimiter = new GeminiRateLimiter(
	CONFIG.GEMINI_MIN_REQUEST_INTERVAL_MS,
);

function parseRetryOptions(
	retriesOrOptions: number | RunWithRetryOptions,
	baseDelayMs: number,
): {
	retries: number;
	currentDelayMs: number;
	priority: RequestPriority;
	customIntervalMs?: number;
} {
	let retries = 4;
	let currentDelayMs = baseDelayMs;
	let priority: RequestPriority = "high";
	let customIntervalMs: number | undefined;

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
		if (retriesOrOptions.priority !== undefined) {
			priority = retriesOrOptions.priority;
		}
		if (retriesOrOptions.customIntervalMs !== undefined) {
			customIntervalMs = retriesOrOptions.customIntervalMs;
		}
	}

	return { retries, currentDelayMs, priority, customIntervalMs };
}

function isTransientError(error: unknown): boolean {
	const err = error as { message?: string; status?: number } | null;
	const errorMessage = err?.message || String(error);
	const status = err?.status || 0;

	return (
		status === 503 ||
		status === 429 ||
		errorMessage.includes("503") ||
		errorMessage.includes("429") ||
		errorMessage.includes("UNAVAILABLE") ||
		errorMessage.includes("RESOURCE_EXHAUSTED") ||
		errorMessage.includes("high demand") ||
		errorMessage.includes("Quota exceeded")
	);
}

export async function runWithRetry<T>(
	fn: () => Promise<T>,
	retriesOrOptions: number | RunWithRetryOptions = 4,
	baseDelayMs = 5000,
): Promise<T> {
	const { retries, priority, customIntervalMs } = parseRetryOptions(
		retriesOrOptions,
		baseDelayMs,
	);
	let { currentDelayMs } = parseRetryOptions(retriesOrOptions, baseDelayMs);
	let lastError: unknown;

	for (let i = 0; i < retries; i++) {
		try {
			return await geminiRateLimiter.schedule(fn, {
				priority,
				customIntervalMs,
			});
		} catch (error) {
			lastError = error;

			if (isTransientError(error) && i < retries - 1) {
				const serverDelayMs = extractRetryDelayMs(error);
				const waitMs =
					serverDelayMs ?? currentDelayMs + Math.floor(Math.random() * 500);

				logger.warn(
					`[Gemini] Rate limit / transient error (Attempt ${i + 1}/${retries}). Waiting ${waitMs}ms before retry...`,
				);
				await new Promise((resolve) => setTimeout(resolve, waitMs));
				currentDelayMs += 5000; // Linear backoff: 5s, 10s, 15s, 20s
			} else {
				throw error;
			}
		}
	}
	throw lastError;
}

export function cleanUserText(text: string | null): string {
	if (!text) return "";
	return text.replace(/\bket\b/gi, "").trim();
}

export function buildHistoryList(history: MessageRow[]) {
	return history.map((msg) => {
		const usernameSuffix = msg.username ? ` (@${msg.username})` : "";
		const senderName = msg.is_bot_reply
			? "You (ket.ai)"
			: `User_${msg.user_id} (${msg.first_name || "Unnamed"}${usernameSuffix})`;
		const fallback = msg.photo_file_id ? "[Photo]" : "[Media]";
		return {
			user_id: msg.is_bot_reply ? undefined : msg.user_id,
			sender: senderName,
			reply_to_message_id: msg.reply_to_message_id || undefined,
			text: msg.is_bot_reply
				? msg.text || fallback
				: cleanUserText(msg.text) || fallback,
		};
	});
}
