import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type { AgentTool } from "../types";

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

export async function readWorkspaceFile(
	args: ReadWorkspaceFileArgs,
): Promise<ReadWorkspaceFileResult> {
	const filename = args.filename?.trim();
	if (!filename) {
		return {
			success: false,
			filename: "",
			error: "Filename parameter is required.",
		};
	}

	const targetUrl = getSandboxTargetUrl("/workspace/read");
	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				filename,
				sessionId: args.sessionId || "default",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			return {
				success: false,
				filename,
				error: `HTTP ${response.status}: ${errorText}`,
				system_note: `Failed to read ${filename}. Check if the file exists using list_workspace_files.`,
			};
		}

		const data = (await response.json()) as {
			success: boolean;
			content?: string;
			sizeBytes?: number;
			error?: string;
		};

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
): Promise<WriteWorkspaceFileResult> {
	const filename = args.filename?.trim();
	const content = args.content ?? "";
	if (!filename) {
		return {
			success: false,
			filename: "",
			error: "Filename parameter is required.",
		};
	}

	const targetUrl = getSandboxTargetUrl("/workspace/write");
	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				filename,
				content,
				sessionId: args.sessionId || "default",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			return {
				success: false,
				filename,
				error: `HTTP ${response.status}: ${errorText}`,
				system_note: `Failed to write ${filename}.`,
			};
		}

		const data = (await response.json()) as {
			success: boolean;
			sizeBytes?: number;
			error?: string;
		};

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
	args: ListWorkspaceFilesArgs,
): Promise<ListWorkspaceFilesResult> {
	const targetUrl = getSandboxTargetUrl("/workspace/list");
	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sessionId: args.sessionId || "default",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			return {
				success: false,
				files: [],
				totalFiles: 0,
				error: `HTTP ${response.status}: ${errorText}`,
			};
		}

		const data = (await response.json()) as {
			success: boolean;
			files?: WorkspaceFileInfo[];
			totalFiles?: number;
			error?: string;
		};

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
	args: ResetWorkspaceArgs,
): Promise<ResetWorkspaceResult> {
	const targetUrl = getSandboxTargetUrl("/workspace/reset");
	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sessionId: args.sessionId || "default",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			return {
				success: false,
				error: `HTTP ${response.status}: ${errorText}`,
			};
		}

		const data = (await response.json()) as {
			success: boolean;
			message?: string;
			error?: string;
		};

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
	execute: async (args: ReadWorkspaceFileArgs) => readWorkspaceFile(args),
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
	execute: async (args: WriteWorkspaceFileArgs) => writeWorkspaceFile(args),
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
	execute: async (args: ListWorkspaceFilesArgs) => listWorkspaceFiles(args),
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
	execute: async (args: ResetWorkspaceArgs) => resetWorkspace(args),
};
