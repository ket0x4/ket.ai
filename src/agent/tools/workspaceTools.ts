import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type { AgentTool, ToolExecutionContext } from "../types";

export interface ReadWorkspaceFileArgs {
	filename: string;
	sessionId?: string;
}

export interface ReadWorkspaceFileResult {
	success: boolean;
	filename: string;
	content?: string;
	sizeBytes?: number;
	error?: string;
	system_note?: string;
}

export interface WriteWorkspaceFileArgs {
	filename: string;
	content: string;
	sessionId?: string;
}

export interface WriteWorkspaceFileResult {
	success: boolean;
	filename: string;
	sizeBytes?: number;
	error?: string;
	system_note?: string;
}

export interface ListWorkspaceFilesArgs {
	sessionId?: string;
}

export interface WorkspaceFileInfo {
	filename: string;
	sizeBytes: number;
	modifiedAt: string;
	isImage: boolean;
}

export interface ListWorkspaceFilesResult {
	success: boolean;
	files: WorkspaceFileInfo[];
	totalFiles: number;
	error?: string;
	system_note?: string;
}

export interface ResetWorkspaceArgs {
	sessionId?: string;
}

export interface ResetWorkspaceResult {
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
			sizeBytes?: number;
			error?: string;
		}>("/workspace/read", {
			filename,
			sessionId: resolvedSessionId,
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
		return {
			success: data.success,
			filename,
			sizeBytes: data.sizeBytes,
			error: data.error,
			system_note: data.success
				? `File '${filename}' written successfully (${data.sizeBytes} bytes).`
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

export const readWorkspaceFileTool: AgentTool<
	ReadWorkspaceFileArgs,
	ReadWorkspaceFileResult
> = {
	name: "read_workspace_file",
	description:
		"Reads the text content of a file located in the current chat session's persistent sandbox workspace. Use this to inspect code, data, logs, or error stack traces across multi-turn interactions.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description:
					"Relative path or name of the file to read (e.g. 'script.py', 'data.csv', 'output.txt').",
			},
		},
		required: ["filename"],
	},
	execute: async (
		args: ReadWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => readWorkspaceFile(args, context),
};

export const writeWorkspaceFileTool: AgentTool<
	WriteWorkspaceFileArgs,
	WriteWorkspaceFileResult
> = {
	name: "write_workspace_file",
	description:
		"Writes or updates a file in the current chat session's persistent sandbox workspace without immediately executing it. Use this to stage scripts, write configuration files, or prepare datasets.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description:
					"Relative path or name of the file to write (e.g. 'helper.py', 'config.json', 'data.csv').",
			},
			content: {
				type: "STRING",
				description: "Complete text content to write to the file.",
			},
		},
		required: ["filename", "content"],
	},
	execute: async (
		args: WriteWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => writeWorkspaceFile(args, context),
};

export const listWorkspaceFilesTool: AgentTool<
	ListWorkspaceFilesArgs,
	ListWorkspaceFilesResult
> = {
	name: "list_workspace_files",
	description:
		"Lists all files and generated plots/images currently existing in the chat session's persistent workspace with their sizes and modification times.",
	parameters: {
		type: "OBJECT",
		properties: {},
	},
	execute: async (
		args: ListWorkspaceFilesArgs,
		context?: ToolExecutionContext,
	) => listWorkspaceFiles(args, context),
};

export const resetWorkspaceTool: AgentTool<
	ResetWorkspaceArgs,
	ResetWorkspaceResult
> = {
	name: "reset_workspace",
	description:
		"Clears all files and state in the current chat session's workspace. Use this when the user asks to start fresh or reset the environment.",
	parameters: {
		type: "OBJECT",
		properties: {},
	},
	execute: async (args: ResetWorkspaceArgs, context?: ToolExecutionContext) =>
		resetWorkspace(args, context),
};
