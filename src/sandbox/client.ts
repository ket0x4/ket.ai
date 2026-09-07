import { CONFIG } from "../config";
import type {
	SandboxExecuteRequest,
	SandboxExecuteResponse,
	SandboxStreamEvent,
	WorkspaceListRequest,
	WorkspaceReadRequest,
	WorkspaceResetRequest,
	WorkspaceWriteRequest,
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

async function requestJson<T>(
	endpoint: string,
	body: Record<string, unknown>,
): Promise<T> {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		CONFIG.SANDBOX_TIMEOUT_MS + 5000,
	);

	try {
		const response = await fetch(getUrl(endpoint), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
		return (await response.json()) as T;
	} finally {
		clearTimeout(timeoutId);
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

	async executeStream(
		request: SandboxExecuteRequest,
		callbacks: SandboxExecuteCallbacks = {},
	): Promise<SandboxExecuteResponse> {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			CONFIG.SANDBOX_TIMEOUT_MS + 5000,
		);

		try {
			const response = await fetch(getUrl("/execute"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
				},
				body: JSON.stringify({ ...request, stream: true }),
				signal: controller.signal,
			});
			if (!response.ok) {
				const text = await response.text().catch(() => "");
				throw new SandboxClientError(
					`Sandbox returned HTTP ${response.status}: ${text}`,
					response.status,
				);
			}
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
			clearTimeout(timeoutId);
		}
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

export const sandboxClient = new SandboxClient();

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
