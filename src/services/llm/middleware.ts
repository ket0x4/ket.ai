import logger from "../../utils/logger";

/**
 * Middleware pipeline for OpenAI-compatible API calls.
 *
 * Every request is wrapped by composable middleware. `withRetry` owns transient
 * error retries and backoff; `withRateLimit` serializes calls through a shared
 * bucket. Retry is the outer layer, so each attempt re-enters the rate limiter.
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

	if (
		status === 408 ||
		status === 409 ||
		status === 429 ||
		(status !== undefined && status >= 500)
	) {
		return true;
	}
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
		message.includes("Quota exceeded") ||
		message.includes("connection error") ||
		message.includes("fetch failed") ||
		message.includes("network timeout")
	);
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

/** Reads a server-suggested backoff (e.g. "retry in 3s") from an error. */
function extractRetryDelayMs(error: unknown): number | null {
	if (!error) return null;

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

/** Shared rate limiter buckets for high-frequency call types. */
export const rateLimiters = {
	embedding: new RateLimiter(() => 100),
	transcribe: new RateLimiter(() => 500),
} as const;

interface ApiCallContext {
	/** Label used in retry log lines, e.g. "OpenAI:embedding". */
	label: string;
	/** Maximum attempts, including the first one. */
	retries: number;
	baseDelayMs: number;
	delayGrowth: "exponential" | "linear";
	limiter?: RateLimiter;
	customIntervalMs?: number;
}

/** Wraps the next call in the pipeline. */
type ApiMiddleware = <T>(
	call: () => Promise<T>,
	context: ApiCallContext,
) => Promise<T>;

export interface RunApiCallOptions {
	retries?: number;
	baseDelayMs?: number;
	/** Serial rate limiter to schedule calls through. */
	limiter?: RateLimiter;
	customIntervalMs?: number;
	/** Label used in retry log lines, e.g. "OpenAI:embedding". */
	logLabel?: string;
	/** How the backoff grows between attempts. */
	delayGrowth?: "exponential" | "linear";
}

const DEFAULT_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 5000;

function resolveContext(options: RunApiCallOptions): ApiCallContext {
	return {
		label: options.logLabel || "LLM",
		retries: options.retries ?? DEFAULT_RETRIES,
		baseDelayMs: options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
		delayGrowth: options.delayGrowth ?? "linear",
		limiter: options.limiter,
		customIntervalMs: options.customIntervalMs,
	};
}

/** Computes how long to wait before the next retry attempt. */
function resolveRetryWaitMs(error: unknown, currentDelayMs: number): number {
	const serverDelayMs = extractRetryDelayMs(error);
	return serverDelayMs ?? currentDelayMs + Math.floor(Math.random() * 500);
}

function nextDelayMs(
	currentDelayMs: number,
	growth: "exponential" | "linear",
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

/** Retries transient failures with backoff, honoring server-suggested delays. */
const withRetry: ApiMiddleware = async (call, context) => {
	let currentDelayMs = context.baseDelayMs;

	for (let attempt = 0; attempt < context.retries; attempt++) {
		try {
			return await call();
		} catch (error) {
			const isLastAttempt = attempt >= context.retries - 1;
			if (!isTransientError(error) || isLastAttempt) throw error;

			const waitMs = resolveRetryWaitMs(error, currentDelayMs);
			await delayBeforeRetry(
				error,
				waitMs,
				context.label,
				attempt + 1,
				context.retries,
			);
			currentDelayMs = nextDelayMs(currentDelayMs, context.delayGrowth);
		}
	}

	// Unreachable: the final attempt either returns or throws.
	throw new Error(`[${context.label}] API call exhausted retries`);
};

/** Serializes a call through the configured rate limiter, when present. */
const withRateLimit: ApiMiddleware = (call, context) => {
	if (!context.limiter) return call();
	return context.limiter.schedule(call, {
		customIntervalMs: context.customIntervalMs,
	});
};

/**
 * Composes middleware around `call`. Earlier middleware entries are outer
 * layers and therefore run first.
 */
function applyMiddlewares<T>(
	call: () => Promise<T>,
	context: ApiCallContext,
	middlewares: ApiMiddleware[],
): Promise<T> {
	return middlewares.reduceRight<() => Promise<T>>(
		(next, middleware) => () => middleware(next, context),
		call,
	)();
}

/** Runs an API call through the default retry + rate-limit pipeline. */
export function runApiCall<T>(
	call: () => Promise<T>,
	options: RunApiCallOptions = {},
): Promise<T> {
	return applyMiddlewares(call, resolveContext(options), [
		withRetry,
		withRateLimit,
	]);
}
