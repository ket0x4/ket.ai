import type { Context } from "grammy";
import type { ToolProgressUpdate } from "../../agent/types";
import { CONFIG } from "../../config";
import logger from "../../utils/logger";

export interface ToolNotifier {
	onToolCall: (
		toolName: string,
		args?: Record<string, unknown>,
		step?: number,
	) => Promise<void>;
	onToolProgress: (
		toolName: string,
		progress: ToolProgressUpdate,
		step?: number,
	) => Promise<void>;
	cleanup: () => Promise<void>;
}

export function normalizeLanguageName(raw?: unknown): string {
	if (typeof raw !== "string") return "script";
	const lower = raw.toLowerCase();
	if (lower === "python") return "Python";
	if (lower === "typescript") return "TypeScript";
	if (lower === "javascript") return "JavaScript";
	if (lower === "bash" || lower === "sh") return "Bash";
	return raw;
}

export function resolveExecuteCodeMessage(
	args: Record<string, unknown>,
): string {
	const packages = Array.isArray(args.packages)
		? (args.packages as string[])
		: [];
	const lang = normalizeLanguageName(args.language);
	const filename =
		typeof args.filename === "string" ? ` (${args.filename})` : "";
	if (packages.length > 0) {
		const pkgList = packages.slice(0, 3).join(", ");
		const suffix = packages.length > 3 ? "..." : "";
		return `📦 Installing dependencies (${pkgList}${suffix}) & running ${lang}${filename}...`;
	}
	return `⚡ Executing ${lang} script${filename} in sandbox...`;
}

export function resolveToolStatusMessage(
	toolName: string,
	args: Record<string, unknown> = {},
): string {
	if (toolName === "web_search") {
		return CONFIG.MESSAGES.tool_status_web_search || "🔍 Searching the web...";
	}

	if (toolName === "execute_code") {
		return resolveExecuteCodeMessage(args);
	}

	const filename = typeof args.filename === "string" ? args.filename : "file";
	switch (toolName) {
		case "read_workspace_file":
			return `📄 Reading workspace file (${filename})...`;
		case "write_workspace_file":
			return `✏️ Writing workspace file (${filename})...`;
		case "send_workspace_file":
			return `📤 Preparing and sending file (${filename})...`;
		case "list_workspace_files":
			return "📁 Scanning session workspace files...";
		case "reset_workspace":
			return "🧹 Cleaning and resetting session workspace...";
		default:
			return `Spawning subagent for (${toolName})...`;
	}
}

export function extractRecentStdoutSnippet(
	fullStdout?: string,
	maxLines = 3,
): string {
	if (!fullStdout) return "";
	const lines = fullStdout
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	if (lines.length === 0) return "";
	const recent = lines.slice(-maxLines);
	return recent
		.map((l) => `> ${l.length > 70 ? `${l.slice(0, 67)}...` : l}`)
		.join("\n");
}

export function createToolNotifier(
	ctx: Context,
	replyToMessageId?: number,
	logPrefix: string = "[Chat]",
): ToolNotifier {
	let statusMessageId: number | undefined;
	let currentBaseStatus = "";
	let currentStdout = "";
	let lastEditTime = 0;
	let throttleTimer: ReturnType<typeof setTimeout> | null = null;
	let latestRenderedText = "";
	let isCleanedUp = false;

	const flushEdit = async () => {
		if (isCleanedUp || !statusMessageId || !ctx.chat || !latestRenderedText) {
			return;
		}
		const textToSend = latestRenderedText;
		lastEditTime = Date.now();
		try {
			await ctx.api.editMessageText(ctx.chat.id, statusMessageId, textToSend);
		} catch (e) {
			logger.debug(`${logPrefix} Failed to edit status message:`, e);
		}
	};

	const queueUpdate = (newText: string) => {
		if (isCleanedUp) return;
		latestRenderedText = newText;
		const now = Date.now();
		const elapsed = now - lastEditTime;

		if (elapsed >= 1500) {
			if (throttleTimer) {
				clearTimeout(throttleTimer);
				throttleTimer = null;
			}
			flushEdit();
		} else if (!throttleTimer) {
			throttleTimer = setTimeout(() => {
				throttleTimer = null;
				flushEdit();
			}, 1500 - elapsed);
		}
	};

	return {
		onToolCall: async (
			toolName: string,
			args: Record<string, unknown> = {},
			_step?: number,
		) => {
			if (isCleanedUp) return;
			currentBaseStatus = resolveToolStatusMessage(toolName, args);
			currentStdout = "";

			if (statusMessageId && ctx.chat) {
				logger.info(
					`${logPrefix} Updating tool status notification: "${currentBaseStatus}"`,
				);
				queueUpdate(currentBaseStatus);
				return;
			}

			logger.info(
				`${logPrefix} Sending tool status notification: "${currentBaseStatus}"`,
			);

			const sentMsg = await ctx
				.reply(
					currentBaseStatus,
					replyToMessageId
						? { reply_to_message_id: replyToMessageId }
						: undefined,
				)
				.catch((e) => {
					logger.warn(`${logPrefix} Failed to send status message:`, e);
					return null;
				});

			if (sentMsg) {
				statusMessageId = sentMsg.message_id;
				lastEditTime = Date.now();
			}
		},
		onToolProgress: async (
			_toolName: string,
			progress: ToolProgressUpdate,
			_step?: number,
		) => {
			if (isCleanedUp) return;
			if (progress.statusText) {
				currentBaseStatus = `⚡ ${progress.statusText}`;
			}
			if (progress.fullStdout) {
				currentStdout = progress.fullStdout;
			}

			const snippet = extractRecentStdoutSnippet(currentStdout);
			const fullMessage = snippet
				? `${currentBaseStatus}\n────────────────────────\n${snippet}`
				: currentBaseStatus;

			queueUpdate(fullMessage);
		},
		cleanup: async () => {
			isCleanedUp = true;
			if (throttleTimer) {
				clearTimeout(throttleTimer);
				throttleTimer = null;
			}
			if (statusMessageId && ctx.chat) {
				await ctx.api.deleteMessage(ctx.chat.id, statusMessageId).catch((e) => {
					logger.warn(`${logPrefix} Failed to delete status message:`, e);
				});
			}
		},
	};
}
