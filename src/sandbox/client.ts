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

async function requestJson<T>(endpoint: string, body: object): Promise<T> {
	const { response, cleanup } = await fetchSandbox(endpoint, body, "application/json");
	try {
		const json = await response.json();
		if (!response.ok) {
			// Attempt to provide a helpful error message from the sandbox
			throw new SandboxClientError((json && (json as any).error) || `Sandbox request failed with status ${response.status}`);
		}
		return json as T;
	} finally {
		cleanup();
	}
}

async function fetchSandbox(
	endpoint: string,
	body: unknown,
	accept?: string,
): Promise<{ response: Response; cleanup: () => void }> {
	const url = `${CONFIG.SANDBOX_URL.replace(/\/+$/, "")}${endpoint}`;
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		CONFIG.SANDBOX_REQUEST_TIMEOUT_MS || 30000,
	);

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(accept ? { Accept: accept } : {}),
		},
		body: JSON.stringify(body),
		signal: controller.signal,
	});

	clearTimeout(timeoutId);
	const cleanup = () => controller.abort();
	return { response, cleanup };
}

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

interface SandboxExecuteCallbacks {
	onEvent?: (event: SandboxStreamEvent) => void;
}

class SandboxClient {
	async execute(
		request: SandboxExecuteRequest,
	): Promise<SandboxExecuteResponse> {
		return requestJson<SandboxExecuteResponse>("/execute", {
			...request,
			stream: false,
		});
	}


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

	cancelExecution(executionId: string) {
		return requestJson<{
			success: boolean;
			executionId: string;
			status?: string;
			message?: string;
			error?: string;
		}>("/execute/cancel", { executionId });
	}

	readFile(request: WorkspaceReadRequest) {
		return requestJson<{
			success: boolean;
			filename: string;
			content?: string;
			data?: string;
			sizeBytes?: number;
			error?: string;
		}>("/workspace/read", request);
	}

	writeFile(request: WorkspaceWriteRequest) {
		return requestJson<{
			success: boolean;
			filename: string;
			sizeBytes?: number;
			error?: string;
		}>("/workspace/write", request);
	}

	listFiles(request: WorkspaceListRequest) {
		return requestJson<{
			success: boolean;
			files?: Array<{
				filename: string;
				sizeBytes: number;
				modifiedAt: string;
				isImage: boolean;
			}>;
			totalFiles?: number;
			error?: string;
		}>("/workspace/list", request);
	}

	resetWorkspace(request: WorkspaceResetRequest) {
		return requestJson<{
			success: boolean;
			message?: string;
			error?: string;
		}>("/workspace/reset", request);
	}
}

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
