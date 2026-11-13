import { CONFIG } from "../../config";
import logger from "../../utils/logger";

/**
 * Single source of truth for LLM request retry logic. Provider adapters wrap
 * their SDK calls here; Gemini callers go through `geminiRunWithRetry`, which
 * adds serial rate limiting per bucket.
 */

interface ErrorLike {
	status?: number;
	code?: string;
	message?: string;
}

/**
 * Transient errors are worth retrying: rate limits (429), server-side
 * failures (5xx), and broken connections. Provider SDKs and plain network
 * failures are normalized into this check.
 */
function isTransientError(error: unknown): boolean {
	const err = (error ?? {}) as ErrorLike;
	const status = err.status;
	const code = err.code;
	const message = err.message || String(error);

	if (status === 429 || (status !== undefined && status >= 500)) return true;
	if (
		code === "ECONNRESET" ||
		code === "ETIMEDOUT" ||
		code === "ECONNREFUSED" ||
		code === "EPIPE"
	) {
		return true;
	}
	return (
		message.includes("429") ||
		message.includes("503") ||
		message.includes("UNAVAILABLE") ||
		message.includes("RESOURCE_EXHAUSTED") ||
		message.includes("INTERNAL") ||
		message.includes("high demand") ||
		message.includes("Quota exceeded") ||
		message.includes("connection error") ||
		message.includes("fetch failed") ||
		message.includes("network timeout")
	);
}

/** Extracts a server-suggested retry delay in ms (Gemini-style error payloads). */
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

/**
 * Serializes requests through a minimum interval so a shared quota is never
 * hammered by concurrent callers.
 */
class RateLimiter {
	private lastRequestEndTime = 0;
	private queue: Promise<void> = Promise.resolve();

	constructor(private readonly defaultIntervalMs: () => number) {}

	public schedule<T>(
		fn: () => Promise<T>,
		options?: { customIntervalMs?: number },
	): Promise<T> {
		const isTestEnv =
			process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
		const interval =
			options?.customIntervalMs ?? (isTestEnv ? 0 : this.defaultIntervalMs());

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

/** Shared Gemini rate limiter buckets. */
const geminiRateLimiters = {
	default: new RateLimiter(() => CONFIG.GEMINI_MIN_REQUEST_INTERVAL_MS ?? 3500),
	embedding: new RateLimiter(() => 100),
	transcribe: new RateLimiter(() => 500),
} as const;

export type GeminiLimiterBucket = keyof typeof geminiRateLimiters;

export interface RunWithRetryOptions {
	retries?: number;
	baseDelayMs?: number;
	/** Serial rate limiter to schedule calls through (e.g. a Gemini bucket). */
	limiter?: RateLimiter;
	customIntervalMs?: number;
	/** Label used in retry log lines, e.g. "Gemini:embedding". */
	logLabel?: string;
	/** How the backoff grows between attempts. */
	delayGrowth?: "exponential" | "linear";
}

function parseRetryOptions(
	options: number | RunWithRetryOptions | undefined,
	defaultRetries: number,
	defaultDelayMs: number,
): Required<Pick<RunWithRetryOptions, "retries" | "baseDelayMs">> &
	RunWithRetryOptions {
	if (typeof options === "number") {
		return { retries: options, baseDelayMs: defaultDelayMs };
	}
	return {
		retries: options?.retries ?? defaultRetries,
		baseDelayMs: options?.baseDelayMs ?? defaultDelayMs,
		limiter: options?.limiter,
		customIntervalMs: options?.customIntervalMs,
		logLabel: options?.logLabel,
		delayGrowth: options?.delayGrowth,
	};
}

/** Computes how long to wait before the next retry attempt. */
function resolveRetryWaitMs(error: unknown, currentDelayMs: number): number {
	const serverDelayMs = extractRetryDelayMs(error);
	return serverDelayMs ?? currentDelayMs + Math.floor(Math.random() * 500);
}

/** Runs one attempt, through the rate limiter when one is configured. */
function attemptCall<T>(
	fn: () => Promise<T>,
	limiter: RateLimiter | undefined,
	customIntervalMs: number | undefined,
): Promise<T> {
	if (limiter) {
		return limiter.schedule(fn, { customIntervalMs });
	}
	return fn();
}

function nextDelayMs(
	currentDelayMs: number,
	growth: "exponential" | "linear" | undefined,
): number {
	return growth === "exponential" ? currentDelayMs * 2 : currentDelayMs + 5000;
}

async function delayBeforeRetry(
	error: unknown,
	waitMs: number,
	label: string,
	attempt: number,
	retries: number,
): Promise<void> {
	logger.warn(
		`[${label}] Transient error (attempt ${attempt}/${retries}). Retrying in ${waitMs}ms:`,
		error instanceof Error ? error.message : error,
	);
	await new Promise((resolve) => setTimeout(resolve, waitMs));
}

/**
 * Runs `fn` with exponential backoff on transient errors. If a server-suggested
 * delay can be parsed from the error, it takes precedence over the backoff.
 */
export async function runWithRetry<T>(
	fn: () => Promise<T>,
	options: number | RunWithRetryOptions = {},
	defaultRetries = 4,
	defaultDelayMs = 5000,
): Promise<T> {
	const opts = parseRetryOptions(options, defaultRetries, defaultDelayMs);
	const label = opts.logLabel || "LLM";
	let currentDelayMs = opts.baseDelayMs;
	let lastError: unknown;

	for (let i = 0; i < opts.retries; i++) {
		try {
			return await attemptCall(fn, opts.limiter, opts.customIntervalMs);
		} catch (error) {
			lastError = error;

			if (isTransientError(error) && i < opts.retries - 1) {
				const waitMs = resolveRetryWaitMs(error, currentDelayMs);
				await delayBeforeRetry(error, waitMs, label, i + 1, opts.retries);
				currentDelayMs = nextDelayMs(currentDelayMs, opts.delayGrowth);
			} else {
				throw error;
			}
		}
	}
	throw lastError;
}

/**
 * `runWithRetry` preconfigured for Gemini API calls: the default bucket
 * rate limiter, 4 attempts, 5s base backoff, and server-delay parsing.
 */
export function geminiRunWithRetry<T>(
	fn: () => Promise<T>,
	options: Omit<RunWithRetryOptions, "limiter" | "logLabel"> & {
		bucket?: GeminiLimiterBucket;
	} = {},
): Promise<T> {
	const bucket = options.bucket ?? "default";
	return runWithRetry(fn, {
		...options,
		limiter: geminiRateLimiters[bucket],
		logLabel: `Gemini:${bucket}`,
		delayGrowth: "linear",
	});
}
