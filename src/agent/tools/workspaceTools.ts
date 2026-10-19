import { extname } from "node:path";
import { CONFIG } from "../../config";
import { requestJson } from "../../sandbox/client";
import logger from "../../utils/logger";
import { inferArtifactType } from "../sanitizer";
import type {
	AgentTool,
	ArtifactMediaType,
	GeneratedMediaArtifact,
	ToolExecutionContext,
} from "../types";

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

interface SearchWorkspaceArgs {
	query: string;
	filePattern?: string;
	maxResults?: number;
	caseSensitive?: boolean;
	sessionId?: string;
}

interface WorkspaceSearchMatch {
	filename: string;
	line: number;
	text: string;
}

interface SearchWorkspaceResult {
	success: boolean;
	query: string;
	matches: WorkspaceSearchMatch[];
	totalMatches: number;
	filesSearched: number;
	truncated?: boolean;
	error?: string;
	system_note?: string;
}

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
}

export interface WriteWorkspaceFileResult {
	success: boolean;
	filename: string;
	sizeBytes?: number;
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

function resolveSessionId(
	context?: ToolExecutionContext,
	argsSessionId?: string,
): string {
	return context?.sessionId || argsSessionId || "default";
}

function validateFilename(filename?: string): string | null {
	const trimmed = filename?.trim();
	return trimmed || null;
}

function getWorkspaceFileMime(filename: string): {
	mimeType: string;
	type: ArtifactMediaType;
} {
	const ext = extname(filename).toLowerCase();
	const mimeType = Bun.file(`file${ext}`).type || "application/octet-stream";
	return { mimeType, type: inferArtifactType(mimeType) };
}

async function readWorkspaceFile(
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
		const data = await requestJson<{
			success: boolean;
			filename: string;
			content?: string;
			data?: string;
			sizeBytes?: number;
			error?: string;
		}>("/workspace/read", {
			filename,
			sessionId: resolvedSessionId,
			encoding: args.encoding,
		});

		return {
			success: data.success,
			filename,
			content: data.content,
			data: data.data,
			sizeBytes: data.sizeBytes,
			error: data.error,
			system_note: data.success
				? undefined
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
		const data = await requestJson<{
			success: boolean;
			filename: string;
			sizeBytes?: number;
			error?: string;
		}>("/workspace/write", {
			filename,
			content,
			sessionId: resolvedSessionId,
			encoding: args.encoding,
		});

		return {
			success: data.success,
			filename,
			sizeBytes: data.sizeBytes,
			error: data.error,
			system_note: data.success
				? undefined
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

interface EditWorkspaceFileArgs {
	filename: string;
	old_string: string;
	new_string: string;
	replace_all?: boolean;
	sessionId?: string;
}

interface EditWorkspaceFileResult {
	success: boolean;
	filename: string;
	replacements?: number;
	sizeBytes?: number;
	error?: string;
	system_note?: string;
}

function countOccurrences(haystack: string, needle: string): number {
	if (!needle) return 0;
	let count = 0;
	let index = haystack.indexOf(needle);
	while (index !== -1) {
		count++;
		index = haystack.indexOf(needle, index + needle.length);
	}
	return count;
}

/**
 * Applies a targeted string replacement inside a workspace file.
 */
async function editWorkspaceFile(
	args: EditWorkspaceFileArgs,
	context?: ToolExecutionContext,
): Promise<EditWorkspaceFileResult> {
	const filename = validateFilename(args.filename);
	if (!filename) {
		return {
			success: false,
			filename: "",
			error: "Filename parameter is required.",
		};
	}
	if (!args.old_string) {
		return {
			success: false,
			filename,
			error: "old_string must be a non-empty exact snippet to replace.",
		};
	}

	const readRes = await readWorkspaceFile(
		{ filename, sessionId: args.sessionId },
		context,
	);
	if (!readRes.success || typeof readRes.content !== "string") {
		return {
			success: false,
			filename,
			error: readRes.error || "Could not read the file.",
		};
	}

	const occurrences = countOccurrences(readRes.content, args.old_string);
	if (occurrences === 0) {
		return {
			success: false,
			filename,
			error:
				"old_string not found in file. Read the file to confirm exact text.",
		};
	}
	if (occurrences > 1 && !args.replace_all) {
		return {
			success: false,
			filename,
			error: `old_string appears ${occurrences} times. Add surrounding context or set replace_all: true.`,
		};
	}

	const updated = args.replace_all
		? readRes.content.split(args.old_string).join(args.new_string ?? "")
		: readRes.content.replace(args.old_string, args.new_string ?? "");

	const writeRes = await writeWorkspaceFile(
		{
			filename,
			content: updated,
			sessionId: args.sessionId,
		},
		context,
	);

	if (!writeRes.success) {
		return {
			success: false,
			filename,
			error: writeRes.error || "Failed to write edited file.",
			system_note: writeRes.system_note,
		};
	}

	return {
		success: true,
		filename,
		replacements: args.replace_all ? occurrences : 1,
		sizeBytes: writeRes.sizeBytes,
	};
}

export async function resetWorkspace(
	args: ResetWorkspaceArgs = {},
	context?: ToolExecutionContext,
): Promise<ResetWorkspaceResult> {
	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const data = await requestJson<{
			success: boolean;
			message?: string;
			error?: string;
		}>("/workspace/reset", {
			sessionId: resolvedSessionId,
		});

		return {
			success: data.success,
			message: data.message,
			error: data.error,
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

async function listWorkspaceFiles(
	args: ListWorkspaceFilesArgs = {},
	context?: ToolExecutionContext,
): Promise<ListWorkspaceFilesResult> {
	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const data = await requestJson<{
			success: boolean;
			files?: WorkspaceFileInfo[];
			totalFiles?: number;
			error?: string;
		}>("/workspace/list", {
			sessionId: resolvedSessionId,
		});

		const files = data.files || [];
		return {
			success: data.success,
			files,
			totalFiles: data.totalFiles || files.length,
			error: data.error,
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

async function searchWorkspace(
	args: SearchWorkspaceArgs,
	context?: ToolExecutionContext,
): Promise<SearchWorkspaceResult> {
	const query = args.query?.trim();
	if (!query) {
		return {
			success: false,
			query: "",
			matches: [],
			totalMatches: 0,
			filesSearched: 0,
			error: "A non-empty query is required.",
		};
	}

	const resolvedSessionId = resolveSessionId(context, args.sessionId);

	try {
		const data = await requestJson<{
			success: boolean;
			matches?: WorkspaceSearchMatch[];
			totalMatches?: number;
			filesSearched?: number;
			truncated?: boolean;
			error?: string;
		}>("/workspace/search", {
			sessionId: resolvedSessionId,
			query,
			filePattern: args.filePattern,
			maxResults: args.maxResults,
			caseSensitive: args.caseSensitive,
		});

		const matches = data.matches || [];
		return {
			success: data.success,
			query,
			matches,
			totalMatches: data.totalMatches || matches.length,
			filesSearched: data.filesSearched || 0,
			truncated: data.truncated,
			error: data.error,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error("[WorkspaceTools] Error searching workspace:", err);
		return {
			success: false,
			query,
			matches: [],
			totalMatches: 0,
			filesSearched: 0,
			error: msg,
			system_note: "Workspace container unreachable.",
		};
	}
}

async function sendWorkspaceFile(
	args: SendWorkspaceFileArgs,
	context?: ToolExecutionContext,
): Promise<SendWorkspaceFileResult> {
	const filename = validateFilename(args.filename);
	if (!filename) {
		return {
			success: false,
			filename: "",
			error: "Filename parameter is required.",
		};
	}

	const lowerFilename = filename.toLowerCase();
	if (context?.sentFiles?.has(lowerFilename)) {
		return {
			success: true,
			filename,
			system_note: `File '${filename}' was already queued for delivery in this turn.`,
		};
	}

	const readRes = await readWorkspaceFile(
		{
			filename,
			sessionId: args.sessionId,
			encoding: "base64",
		},
		context,
	);

	if (!readRes.success || !readRes.data) {
		return {
			success: false,
			filename: readRes.filename,
			error: readRes.error || `File '${filename}' not found in workspace.`,
		};
	}

	try {
		const buffer = Buffer.from(readRes.data, "base64");
		const { mimeType, type: artType } = getWorkspaceFileMime(filename);

		const artifact: GeneratedMediaArtifact = {
			filename,
			mimeType,
			buffer,
			type: artType,
			sizeBytes: buffer.length,
			caption: args.caption?.trim() || undefined,
		};

		if (context?.emitArtifact) {
			context.emitArtifact(artifact);
		}
		context?.sentFiles?.add(lowerFilename);

		return {
			success: true,
			filename,
			sizeBytes: buffer.length,
			system_note: `Queued '${filename}' for Telegram delivery.`,
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
		};
	}
}

export const listWorkspaceFilesTool: AgentTool<
	ListWorkspaceFilesArgs,
	ListWorkspaceFilesResult
> = {
	name: "list_workspace_files",
	description: "Lists all files and sizes in the session workspace.",
	parameters: {
		type: "OBJECT",
		properties: {},
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (
		args: ListWorkspaceFilesArgs,
		context?: ToolExecutionContext,
	) => {
		return listWorkspaceFiles(args, context);
	},
};

export const searchWorkspaceTool: AgentTool<
	SearchWorkspaceArgs,
	SearchWorkspaceResult
> = {
	name: "search_workspace",
	description:
		"Searches workspace text/code files for a string and returns matching file, line number, and text.",
	parameters: {
		type: "OBJECT",
		properties: {
			query: {
				type: "STRING",
				description: "Text to search for (case-insensitive by default).",
			},
			filePattern: {
				type: "STRING",
				description: "Optional filename glob (e.g. '*.py').",
			},
			maxResults: {
				type: "INTEGER",
				description: "Optional max matches (default 50).",
			},
			caseSensitive: {
				type: "BOOLEAN",
				description: "Optional case-sensitive flag.",
			},
		},
		required: ["query"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (
		args: SearchWorkspaceArgs,
		context?: ToolExecutionContext,
	) => {
		return searchWorkspace(args, context);
	},
};

export const readWorkspaceFileTool: AgentTool<
	ReadWorkspaceFileArgs,
	ReadWorkspaceFileResult
> = {
	name: "read_workspace_file",
	description: "Reads a text or code file from the session workspace.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description: "Filename in workspace to read.",
			},
		},
		required: ["filename"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (
		args: ReadWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => {
		return readWorkspaceFile(args, context);
	},
};

export const writeWorkspaceFileTool: AgentTool<
	WriteWorkspaceFileArgs,
	WriteWorkspaceFileResult
> = {
	name: "write_workspace_file",
	description:
		"Writes or overwrites a text/code file in the session workspace.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description: "Filename to write.",
			},
			content: {
				type: "STRING",
				description: "Text/code content.",
			},
		},
		required: ["filename", "content"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (
		args: WriteWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => {
		return writeWorkspaceFile(args, context);
	},
};

export const editWorkspaceFileTool: AgentTool<
	EditWorkspaceFileArgs,
	EditWorkspaceFileResult
> = {
	name: "edit_workspace_file",
	description:
		"Replaces an exact snippet inside an existing workspace text/code file.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description: "Filename to edit.",
			},
			old_string: {
				type: "STRING",
				description: "Exact snippet to find.",
			},
			new_string: {
				type: "STRING",
				description: "Replacement text.",
			},
			replace_all: {
				type: "BOOLEAN",
				description: "Optional flag to replace all occurrences.",
			},
		},
		required: ["filename", "old_string", "new_string"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (
		args: EditWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => {
		return editWorkspaceFile(args, context);
	},
};

export const sendWorkspaceFileTool: AgentTool<
	SendWorkspaceFileArgs,
	SendWorkspaceFileResult
> = {
	name: "send_workspace_file",
	description:
		"Delivers a workspace file (chart, spreadsheet, PDF, video, code) to the user in Telegram.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description: "Filename in workspace to send.",
			},
			caption: {
				type: "STRING",
				description: "Optional caption.",
			},
		},
		required: ["filename"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (
		args: SendWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => {
		return sendWorkspaceFile(args, context);
	},
};

export const resetWorkspaceTool: AgentTool<
	ResetWorkspaceArgs,
	ResetWorkspaceResult
> = {
	name: "reset_workspace",
	description: "Clears all files in the current session workspace.",
	parameters: {
		type: "OBJECT",
		properties: {},
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (args: ResetWorkspaceArgs, context?: ToolExecutionContext) => {
		return resetWorkspace(args, context);
	},
};
