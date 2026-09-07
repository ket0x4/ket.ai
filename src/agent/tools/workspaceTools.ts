import { extname } from "node:path";
import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import { inferArtifactType } from "../sanitizer";
import type {
	ArtifactMediaType,
	GeneratedMediaArtifact,
	ToolExecutionContext,
} from "../types";

interface ReadWorkspaceFileArgs {
	filename: string;
	sessionId?: string;
	encoding?: "utf-8" | "base64";
}

interface ReadWorkspaceFileResult {
	success: boolean;
	filename: string;
	content?: string;
	data?: string;
	sizeBytes?: number;
	error?: string;
	system_note?: string;
}

interface WriteWorkspaceFileArgs {
	filename: string;
	content: string;
	sessionId?: string;
	encoding?: "utf-8" | "base64";
	sendToUser?: boolean;
}

interface WriteWorkspaceFileResult {
	success: boolean;
	filename: string;
	sizeBytes?: number;
	error?: string;
	system_note?: string;
}

interface SendWorkspaceFileArgs {
	filename: string;
	caption?: string;
	sessionId?: string;
}

interface SendWorkspaceFileResult {
	success: boolean;
	filename: string;
	sizeBytes?: number;
	error?: string;
	system_note?: string;
}

interface ListWorkspaceFilesArgs {
	sessionId?: string;
}

interface WorkspaceFileInfo {
	filename: string;
	sizeBytes: number;
	modifiedAt: string;
	isImage: boolean;
}

interface ListWorkspaceFilesResult {
	success: boolean;
	files: WorkspaceFileInfo[];
	totalFiles: number;
	error?: string;
	system_note?: string;
}

interface ResetWorkspaceArgs {
	sessionId?: string;
}

interface ResetWorkspaceResult {
	success: boolean;
	message?: string;
	error?: string;
	system_note?: string;
}

function getSandboxTargetUrl(endpoint: string): string {
	const sandboxUrl = CONFIG.SANDBOX_URL.replace(/\/+$/, "");
	return `${sandboxUrl}${endpoint}`;
}

function resolveSessionId(
	context?: ToolExecutionContext,
	argsSessionId?: string,
): string {
	// Security: context.sessionId is authoritative from authenticated bot session
	return context?.sessionId || argsSessionId || "default";
}

function validateFilename(filename?: string): string | null {
	const trimmed = filename?.trim();
	return trimmed || null;
}

async function postToWorkspaceSandbox<T>(
	endpoint: string,
	body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
	const targetUrl = getSandboxTargetUrl(endpoint);
	const response = await fetch(targetUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		return {
			ok: false,
			error: `HTTP ${response.status}: ${errorText}`,
		};
	}

	const data = (await response.json()) as T;
	return { ok: true, data };
}

function getWorkspaceFileMime(filename: string): {
	mimeType: string;
	type: ArtifactMediaType;
} {
	const ext = extname(filename).toLowerCase();
	const mimeType = Bun.file(`file${ext}`).type || "application/octet-stream";
	return { mimeType, type: inferArtifactType(mimeType) };
}

export async function readWorkspaceFile(
	args: ReadWorkspaceFileArgs,
	context?: ToolExecutionContext,
): Promise<ReadWorkspaceFileResult> {
	const filename = validateFilename(args.filename);
	if (!filename) {
		return {
			success: false,
			filename: "",
			error: "Filename parameter is required.",
		};
	}

	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const res = await postToWorkspaceSandbox<{
			success: boolean;
			content?: string;
			data?: string;
			sizeBytes?: number;
			error?: string;
		}>("/workspace/read", {
			filename,
			sessionId: resolvedSessionId,
			encoding: args.encoding,
		});

		if (!res.ok) {
			return {
				success: false,
				filename,
				error: res.error,
				system_note: `Failed to read ${filename}. Check if the file exists using list_workspace_files.`,
			};
		}

		const data = res.data;
		return {
			success: data.success,
			filename,
			content: data.content,
			data: data.data,
			sizeBytes: data.sizeBytes,
			error: data.error,
			system_note: data.success
				? `File '${filename}' read successfully (${data.sizeBytes} bytes).`
				: `Could not read '${filename}': ${data.error}`,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error(`[WorkspaceTools] Error reading file ${filename}:`, err);
		return {
			success: false,
			filename,
			error: msg,
			system_note: "Workspace container unreachable.",
		};
	}
}

export async function writeWorkspaceFile(
	args: WriteWorkspaceFileArgs,
	context?: ToolExecutionContext,
): Promise<WriteWorkspaceFileResult> {
	const filename = validateFilename(args.filename);
	if (!filename) {
		return {
			success: false,
			filename: "",
			error: "Filename parameter is required.",
		};
	}

	const content = args.content ?? "";
	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const res = await postToWorkspaceSandbox<{
			success: boolean;
			sizeBytes?: number;
			error?: string;
		}>("/workspace/write", {
			filename,
			content,
			sessionId: resolvedSessionId,
			encoding: args.encoding,
		});

		if (!res.ok) {
			return {
				success: false,
				filename,
				error: res.error,
				system_note: `Failed to write ${filename}.`,
			};
		}

		const data = res.data;

		if (args.sendToUser && data.success && context?.emitArtifact) {
			const buf =
				args.encoding === "base64"
					? Buffer.from(content, "base64")
					: Buffer.from(content, "utf-8");
			const { mimeType, type: artType } = getWorkspaceFileMime(filename);

			context.emitArtifact({
				filename,
				mimeType,
				buffer: buf,
				type: artType,
				sizeBytes: buf.length,
			});
		}

		return {
			success: data.success,
			filename,
			sizeBytes: data.sizeBytes,
			error: data.error,
			system_note: data.success
				? `File '${filename}' written successfully (${data.sizeBytes} bytes)${args.sendToUser ? " and queued for sending to user" : ""}.`
				: `Failed writing '${filename}': ${data.error}`,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error(`[WorkspaceTools] Error writing file ${filename}:`, err);
		return {
			success: false,
			filename,
			error: msg,
			system_note: "Workspace container unreachable.",
		};
	}
}

export async function sendWorkspaceFile(
	args: SendWorkspaceFileArgs,
	context?: ToolExecutionContext,
): Promise<SendWorkspaceFileResult> {
	const readRes = await readWorkspaceFile(
		{
			filename: args.filename,
			sessionId: args.sessionId,
			encoding: "base64",
		},
		context,
	);

	if (!readRes.success || !readRes.data) {
		return {
			success: false,
			filename: readRes.filename,
			error: readRes.error,
			system_note: `Could not retrieve '${args.filename}' to send to user. Ensure file exists in workspace.`,
		};
	}

	try {
		const filename = readRes.filename;
		const buffer = Buffer.from(readRes.data, "base64");
		const { mimeType, type: artType } = getWorkspaceFileMime(filename);

		const artifact: GeneratedMediaArtifact = {
			filename,
			mimeType,
			buffer,
			type: artType,
			sizeBytes: buffer.length,
		};

		if (context?.emitArtifact) {
			context.emitArtifact(artifact);
		}

		return {
			success: true,
			filename,
			sizeBytes: buffer.length,
			system_note: `File '${filename}' (${buffer.length} bytes) successfully queued and will be delivered to the user as a Telegram file attachment.`,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error(
			`[WorkspaceTools] Error sending file ${readRes.filename}:`,
			err,
		);
		return {
			success: false,
			filename: readRes.filename,
			error: msg,
			system_note: "Failed to read file from workspace for delivery.",
		};
	}
}

export async function listWorkspaceFiles(
	args: ListWorkspaceFilesArgs = {},
	context?: ToolExecutionContext,
): Promise<ListWorkspaceFilesResult> {
	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const res = await postToWorkspaceSandbox<{
			success: boolean;
			files?: WorkspaceFileInfo[];
			totalFiles?: number;
			error?: string;
		}>("/workspace/list", {
			sessionId: resolvedSessionId,
		});

		if (!res.ok) {
			return {
				success: false,
				files: [],
				totalFiles: 0,
				error: res.error,
			};
		}

		const data = res.data;
		const files = data.files || [];
		return {
			success: data.success,
			files,
			totalFiles: data.totalFiles || files.length,
			error: data.error,
			system_note: `Found ${files.length} file(s) in the current session workspace: [${files.map((f) => f.filename).join(", ")}].`,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error("[WorkspaceTools] Error listing workspace files:", err);
		return {
			success: false,
			files: [],
			totalFiles: 0,
			error: msg,
			system_note: "Workspace container unreachable.",
		};
	}
}

export async function resetWorkspace(
	args: ResetWorkspaceArgs = {},
	context?: ToolExecutionContext,
): Promise<ResetWorkspaceResult> {
	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const res = await postToWorkspaceSandbox<{
			success: boolean;
			message?: string;
			error?: string;
		}>("/workspace/reset", {
			sessionId: resolvedSessionId,
		});

		if (!res.ok) {
			return {
				success: false,
				error: res.error,
			};
		}

		const data = res.data;
		return {
			success: data.success,
			message: data.message,
			error: data.error,
			system_note: "Session workspace was cleaned and reset to an empty state.",
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error("[WorkspaceTools] Error resetting workspace:", err);
		return {
			success: false,
			error: msg,
			system_note: "Workspace container unreachable.",
		};
	}
}
