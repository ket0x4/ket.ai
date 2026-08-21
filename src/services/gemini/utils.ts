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

export function getSystemInstruction(): string {
	return cachedSystemPrompt;
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

/**
 * Pacing rate limiter to enforce minimum time interval between consecutive Gemini API requests.
 */
export class GeminiRateLimiter {
	private lastRequestEndTime = 0;
	private minIntervalMs: number;
	private queue: Promise<void> = Promise.resolve();

	constructor(minIntervalMs = 3500) {
		this.minIntervalMs = minIntervalMs;
	}

	public setMinInterval(ms: number): void {
		this.minIntervalMs = ms;
	}

	public async schedule<T>(
		fn: () => Promise<T>,
		customIntervalMs?: number,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue = this.queue
				.then(async () => {
					const isTestEnv =
						process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
					const interval =
						customIntervalMs ??
						(isTestEnv
							? 0
							: (CONFIG.GEMINI_MIN_REQUEST_INTERVAL_MS ?? this.minIntervalMs));
					const now = Date.now();
					const elapsed = now - this.lastRequestEndTime;
					if (
						interval > 0 &&
						this.lastRequestEndTime > 0 &&
						elapsed < interval
					) {
						const waitMs = interval - elapsed;
						logger.debug(
							`[RateLimiter] Enforcing ${waitMs}ms artificial pacing delay before Gemini request...`,
						);
						await new Promise((r) => setTimeout(r, waitMs));
					}
					try {
						const result = await fn();
						this.lastRequestEndTime = Date.now();
						resolve(result);
					} catch (err) {
						this.lastRequestEndTime = Date.now();
						reject(err);
					}
				})
				.catch(() => {});
		});
	}
}

const geminiRateLimiter = new GeminiRateLimiter(
	CONFIG.GEMINI_MIN_REQUEST_INTERVAL_MS,
);

export async function runWithRetry<T>(
	fn: () => Promise<T>,
	retries = 4,
	baseDelayMs = 5000,
): Promise<T> {
	let lastError: unknown;
	let currentDelayMs = baseDelayMs;

	for (let i = 0; i < retries; i++) {
		try {
			return await geminiRateLimiter.schedule(fn);
		} catch (error) {
			lastError = error;
			const err = error as { message?: string; status?: number } | null;
			const errorMessage = err?.message || String(error);
			const status = err?.status || 0;

			const isTransient =
				status === 503 ||
				status === 429 ||
				errorMessage.includes("503") ||
				errorMessage.includes("429") ||
				errorMessage.includes("UNAVAILABLE") ||
				errorMessage.includes("RESOURCE_EXHAUSTED") ||
				errorMessage.includes("high demand") ||
				errorMessage.includes("Quota exceeded");

			if (isTransient && i < retries - 1) {
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
			: `User: ${msg.first_name || "Unnamed"}${usernameSuffix}`;
		const fallback = msg.photo_file_id ? "[Photo]" : "[Media]";
		return {
			sender: senderName,
			reply_to_message_id: msg.reply_to_message_id || undefined,
			text: msg.is_bot_reply
				? msg.text || fallback
				: cleanUserText(msg.text) || fallback,
		};
	});
}
