import type {
	AuthContext,
	BotSettings,
	Chat,
	LogEntry,
	Memory,
	MemoryCategory,
	Persona,
	SandboxResponse,
	SandboxRunOptions,
	StatsResponse,
	TelegramUser,
	ToolTrace,
} from "@/types";

declare global {
	interface Window {
		Telegram?: {
			WebApp?: {
				initData: string;
				initDataUnsafe?: {
					user?: TelegramUser;
				};
				ready: () => void;
				expand: () => void;
				close: () => void;
				setHeaderColor?: (color: string) => void;
				setBackgroundColor?: (color: string) => void;
				enableClosingConfirmation?: () => void;
			};
		};
	}
}

export const getTelegramWebApp = () => {
	if (typeof window !== "undefined" && window.Telegram?.WebApp) {
		return window.Telegram.WebApp;
	}
	return null;
};

const getInitData = (): string => {
	const tg = getTelegramWebApp();
	if (tg?.initData) {
		return tg.initData;
	}

	if (typeof window !== "undefined") {
		// 1. Check URL search query (?initData=... or ?tgWebAppData=...)
		const searchParams = new URLSearchParams(window.location.search);
		const paramInitData =
			searchParams.get("initData") || searchParams.get("tgWebAppData");
		if (paramInitData) {
			return decodeURIComponent(paramInitData);
		}

		// 2. Check URL hash (#tgWebAppData=... which Telegram Web frequently sets)
		if (window.location.hash) {
			const hashString = window.location.hash.replace(/^#/, "");
			const hashParams = new URLSearchParams(hashString);
			const hashInitData =
				hashParams.get("tgWebAppData") || hashParams.get("initData");
			if (hashInitData) {
				return decodeURIComponent(hashInitData);
			}
		}

		// 3. Check stored developer token
		const stored = localStorage.getItem("ket_dev_init_data");
		if (stored) return stored;
	}

	return "";
};

async function apiFetch<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const initData = getInitData();
	const headers = new Headers(options.headers || {});

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	if (initData) {
		headers.set("x-telegram-init-data", initData);
	}

	const res = await fetch(endpoint, {
		...options,
		headers,
	});

	if (!res.ok) {
		const errorBody = await res
			.json()
			.catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
		throw new Error(errorBody.error || `HTTP ${res.status}`);
	}

	return (await res.json()) as T;
}

function parseSseMessagePart(
	part: string,
	onChunk: (event: {
		type: "status" | "stdout" | "stderr" | "result" | string;
		text: string;
		data?: unknown;
	}) => void,
) {
	const trimmed = part.trim();
	if (!trimmed) return;
	let eventType = "message";
	let dataText = "";
	for (const line of trimmed.split("\n")) {
		if (line.startsWith("event: ")) eventType = line.slice(7).trim();
		else if (line.startsWith("data: ")) dataText = line.slice(6);
	}
	let parsedData: unknown = dataText;
	try {
		parsedData = JSON.parse(dataText);
	} catch {}
	onChunk({ type: eventType, text: dataText, data: parsedData });
}

async function readSseStream(
	body: ReadableStream<Uint8Array>,
	onChunk: (event: {
		type: "status" | "stdout" | "stderr" | "result" | string;
		text: string;
		data?: unknown;
	}) => void,
) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) {
			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split("\n\n");
			buffer = parts.pop() || "";
			for (const part of parts) {
				parseSseMessagePart(part, onChunk);
			}
		}
	}
}

export const api = {
	auth: {
		me: () => apiFetch<AuthContext>("/api/me"),
	},
	stats: {
		get: () => apiFetch<StatsResponse>("/api/stats"),
	},
	personas: {
		list: () =>
			apiFetch<{
				personas: Persona[];
				activePersonas: Record<string, string | null>;
			}>("/api/personas"),
		create: (data: {
			name: string;
			description?: string;
			prompt: string;
			emoji?: string;
		}) =>
			apiFetch<{ success: boolean; persona: Persona }>("/api/personas", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (
			id: string,
			data: {
				name?: string;
				description?: string | null;
				prompt?: string;
				emoji?: string;
			},
		) =>
			apiFetch<{ success: boolean; persona: Persona }>(`/api/personas/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			apiFetch<{ success: boolean; message: string }>(`/api/personas/${id}`, {
				method: "DELETE",
			}),
		select: (data: { chatId: string; personaId: string | null }) =>
			apiFetch<{
				success: boolean;
				chatId: string;
				personaId: string | null;
			}>("/api/personas/select", {
				method: "POST",
				body: JSON.stringify(data),
			}),
	},
	chats: {
		list: () => apiFetch<Chat[]>("/api/chats"),
		update: (
			chatId: string,
			data: { is_allowed?: boolean; reply_probability?: number },
		) =>
			apiFetch<{ success: boolean; chat: Chat }>(`/api/chats/${chatId}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (chatId: string) =>
			apiFetch<{ success: boolean; message: string }>(`/api/chats/${chatId}`, {
				method: "DELETE",
			}),
		allow: (chatId: string) =>
			apiFetch<{ success: boolean; chat: Chat }>(`/api/chats/${chatId}/allow`, {
				method: "POST",
			}),
		disallow: (chatId: string) =>
			apiFetch<{ success: boolean; chat: Chat }>(
				`/api/chats/${chatId}/disallow`,
				{
					method: "POST",
				},
			),
	},
	memories: {
		list: (params?: {
			chatId?: string;
			category?: string;
			search?: string;
			scope?: string;
		}) => {
			const searchParams = new URLSearchParams();
			if (params?.chatId) searchParams.append("chat_id", params.chatId);
			if (params?.category) searchParams.append("category", params.category);
			if (params?.search) searchParams.append("search", params.search);
			if (params?.scope) searchParams.append("scope", params.scope);
			const qs = searchParams.toString();
			return apiFetch<Memory[]>(`/api/memories${qs ? `?${qs}` : ""}`);
		},
		create: (data: {
			chatId: string;
			memoryText: string;
			category?: MemoryCategory;
		}) =>
			apiFetch<{ success: boolean; message?: string }>("/api/memories", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (
			id: number,
			data: { memoryText?: string; category?: MemoryCategory },
		) =>
			apiFetch<{ success: boolean; message?: string }>(`/api/memories/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (id: number) =>
			apiFetch<{ success: boolean; message?: string }>(`/api/memories/${id}`, {
				method: "DELETE",
			}),
		prune: (chatId?: string) =>
			apiFetch<{ success: boolean; prunedCount: number }>(
				"/api/memories/prune",
				{
					method: "POST",
					body: JSON.stringify(chatId ? { chatId } : {}),
				},
			),
		export: () => apiFetch<unknown>("/api/memories/export"),
		import: (
			memories: Array<{
				chatId?: string;
				memoryText?: string;
				category?: MemoryCategory;
			}>,
		) =>
			apiFetch<{ success: boolean; importedCount: number }>(
				"/api/memories/import",
				{
					method: "POST",
					body: JSON.stringify({ memories }),
				},
			),
	},
	settings: {
		get: () => apiFetch<BotSettings>("/api/settings"),
		update: (data: Partial<BotSettings>) =>
			apiFetch<{ success: boolean; message?: string; settings?: BotSettings }>(
				"/api/settings",
				{
					method: "PATCH",
					body: JSON.stringify(data),
				},
			),
		clearCache: () =>
			apiFetch<{ success: boolean; message: string }>(
				"/api/settings/cache-clear",
				{
					method: "POST",
				},
			),
	},
	logs: {
		get: (params?: {
			type?: "app" | "error";
			level?: string;
			search?: string;
			limit?: number;
		}) => {
			const searchParams = new URLSearchParams();
			if (params?.type === "error") searchParams.append("type", "error");
			if (params?.level && params.level !== "ALL")
				searchParams.append("level", params.level);
			if (params?.search) searchParams.append("search", params.search);
			if (params?.limit) searchParams.append("limit", params.limit.toString());
			const qs = searchParams.toString();
			return apiFetch<{ logs: LogEntry[] }>(`/api/logs${qs ? `?${qs}` : ""}`);
		},
	},
	traces: {
		get: () => apiFetch<{ traces: ToolTrace[] }>("/api/tool-traces"),
	},
	sandbox: {
		run: (data: SandboxRunOptions) =>
			apiFetch<SandboxResponse>("/api/sandbox", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		execute: (data: {
			language: string;
			code: string;
			packages?: string[];
			sessionId?: string;
			filename?: string;
			target_files?: string[];
		}) =>
			apiFetch<{
				success: boolean;
				stdout: string;
				stderr?: string;
				exitCode: number;
				executionTimeMs: number;
				errorHint?: string;
				artifacts?: Array<{
					filename: string;
					mimeType: string;
					data: string;
					type: string;
					sizeBytes: number;
				}>;
				images?: Array<{
					filename: string;
					mimeType: string;
					data: string;
					type: string;
					sizeBytes: number;
				}>;
			}>("/api/sandbox/execute", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		executeStream: async (
			data: {
				language: string;
				code: string;
				packages?: string[];
				sessionId?: string;
				filename?: string;
				target_files?: string[];
			},
			onChunk: (event: {
				type: "status" | "stdout" | "stderr" | "result" | string;
				text: string;
				data?: unknown;
			}) => void,
		) => {
			const initData = getInitData();
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				Accept: "text/event-stream",
			};
			if (initData) {
				headers["x-telegram-init-data"] = initData;
			}
			const res = await fetch("/api/sandbox/execute", {
				method: "POST",
				headers,
				body: JSON.stringify({ ...data, stream: true }),
			});
			if (!res.ok) {
				const err = (await res.json().catch(() => ({
					error: `HTTP ${res.status}: ${res.statusText}`,
				}))) as { error?: string };
				throw new Error(err.error || `HTTP ${res.status}`);
			}
			if (res.body) {
				await readSseStream(res.body, onChunk);
			}
		},
	},
};
