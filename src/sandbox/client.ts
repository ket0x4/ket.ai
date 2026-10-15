import { CONFIG } from "../config";
import type {
	SandboxExecuteRequest,
	SandboxExecuteResponse,
	SandboxStreamEvent,
} from "./contracts";
import { readSseStream } from "./sse";

class SandboxClientError extends Error {
	readonly status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "SandboxClientError";
		this.status = status;
	}
}

class SandboxTimeoutError extends Error {
	readonly budgetMs: number;

	constructor(budgetMs: number) {
		super(`Sandbox request exceeded the ${budgetMs}ms client timeout.`);
		this.name = "SandboxTimeoutError";
		this.budgetMs = budgetMs;
	}
}

// A sandbox request can spend time installing packages before it even starts
// executing, and streaming runs keep the connection open for the whole job.
// Budget the client-side abort for the *total* request, not just execution.
const CLIENT_TIMEOUT_SLACK_MS = 5000;
const PACKAGE_INSTALL_BUDGET_MS = 60_000;
const MAX_CLIENT_TIMEOUT_MS = 10 * 60_000;

function resolveClientTimeoutMs(body: unknown): number {
	const record = (body && typeof body === "object" ? body : {}) as {
		timeoutMs?: unknown;
		packages?: unknown;
	};
	const requested =
		typeof record.timeoutMs === "number" && record.timeoutMs > 0
			? record.timeoutMs
			: CONFIG.SANDBOX_TIMEOUT_MS || 45_000;
	const hasPackages = Array.isArray(record.packages) && record.packages.length > 0;
	const installBudget = hasPackages ? PACKAGE_INSTALL_BUDGET_MS : 0;
	return Math.min(
		requested + installBudget + CLIENT_TIMEOUT_SLACK_MS,
		MAX_CLIENT_TIMEOUT_MS,
	);
}

function getUrl(endpoint: string): string {
	return `${CONFIG.SANDBOX_URL.replace(/\/+$/, "")}${endpoint}`;
}

async function fetchSandbox(
	endpoint: string,
	body: unknown,
	accept?: string,
): Promise<{ response: Response; cleanup: () => void }> {
	const controller = new AbortController();
	const budgetMs = resolveClientTimeoutMs(body);
	let timedOut = false;
	const timeoutId = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, budgetMs);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (accept) headers.Accept = accept;

	try {
		const response = await fetch(getUrl(endpoint), {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			signal: controller.signal,
		});
		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new SandboxClientError(
				`Sandbox returned HTTP ${response.status}: ${text}`,
				response.status,
			);
		}
		return { response, cleanup: () => clearTimeout(timeoutId) };
	} catch (err) {
		clearTimeout(timeoutId);
		if (timedOut) throw new SandboxTimeoutError(budgetMs);
		throw err;
	}
}

export async function requestJson<T>(
	endpoint: string,
	body: Record<string, unknown>,
): Promise<T> {
	const { response, cleanup } = await fetchSandbox(endpoint, body);
	try {
		return (await response.json()) as T;
	} finally {
		cleanup();
	}
}

interface SandboxExecuteCallbacks {
	onEvent?: (event: SandboxStreamEvent) => void;
}

async function executeCode(
	request: SandboxExecuteRequest,
): Promise<SandboxExecuteResponse> {
	return requestJson<SandboxExecuteResponse>("/execute", {
		...request,
		stream: false,
	});
}

async function executeStream(
	request: SandboxExecuteRequest,
	callbacks: SandboxExecuteCallbacks = {},
): Promise<SandboxExecuteResponse> {
	const { response, cleanup } = await fetchSandbox(
		"/execute",
		{ ...request, stream: true },
		"text/event-stream",
	);

	try {
		if (!response.body) {
			throw new SandboxClientError("Sandbox response body is empty");
		}

		const result = await readSseStream(
			response.body,
			callbacks.onEvent || (() => {}),
		);
		if (!result) {
			throw new SandboxClientError(
				"Sandbox stream ended without a result event",
			);
		}
		return result;
	} finally {
		cleanup();
	}
}

export const sandboxClient = {
	execute: executeCode,
	executeStream,
};

export function isSandboxConnectionError(error: unknown): boolean {
	if (isSandboxTimeoutError(error)) return false;
	const message = error instanceof Error ? error.message : String(error);
	const lower = message.toLowerCase();
	return (
		lower.includes("econnrefused") ||
		lower.includes("fetch failed") ||
		lower.includes("aborterror") ||
		lower.includes("unable to connect") ||
		lower.includes("connection refused") ||
		lower.includes("failed to connect")
	);
}

export function isSandboxTimeoutError(error: unknown): boolean {
	return (
		error instanceof SandboxTimeoutError ||
		(error instanceof Error && error.name === "SandboxTimeoutError")
	);
}
