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

function getUrl(endpoint: string): string {
	return `${CONFIG.SANDBOX_URL.replace(/\/+$/, "")}${endpoint}`;
}

async function fetchSandbox(
	endpoint: string,
	body: unknown,
	accept?: string,
): Promise<{ response: Response; cleanup: () => void }> {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		CONFIG.SANDBOX_TIMEOUT_MS + 5000,
	);
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
	callbacks: { onEvent?: (event: SandboxStreamEvent) => void } = {},
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
