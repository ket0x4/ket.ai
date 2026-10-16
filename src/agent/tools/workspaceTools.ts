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
	sendToUser?: boolean;
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

interface EditWorkspaceFileArgs {
	filename: string;
	old_string: string;
	new_string: string;
	replace_all?: boolean;
	sessionId?: string;
	sendToUser?: boolean;
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
 * Applies a targeted string replacement inside a workspace file. Reads the
 * current file, replaces an exact (and by default unique) match, and writes it
 * back. Far safer than rewriting whole files for small edits.
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
			system_note:
				"Provide the exact text to find. Read the file first if unsure.",
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
			system_note: `File '${filename}' could not be read for editing. Ensure it exists as a text file.`,
		};
	}

	const occurrences = countOccurrences(readRes.content, args.old_string);
	if (occurrences === 0) {
		return {
			success: false,
			filename,
			error: "old_string not found in file.",
			system_note:
				"The snippet to replace was not found. Read the file to confirm the exact text (including whitespace).",
		};
	}
	if (occurrences > 1 && !args.replace_all) {
		return {
			success: false,
			filename,
			error: `old_string appears ${occurrences} times.`,
			system_note:
				"Ambiguous match. Include more surrounding context to make it unique, or set replace_all to true.",
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
			sendToUser: args.sendToUser,
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

	const replacements = args.replace_all ? occurrences : 1;
	return {
		success: true,
		filename,
		replacements,
		sizeBytes: writeRes.sizeBytes,
		system_note: `Applied ${replacements} replacement(s) to '${filename}'.${args.sendToUser ? " The updated file was also queued for delivery to the user." : ""}`,
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
			system_note:
				matches.length > 0
					? `Found ${data.totalMatches ?? matches.length} match(es) for "${query}" across ${data.filesSearched ?? 0} file(s).${data.truncated ? " Results were truncated; refine the query or pattern." : ""}`
					: `No matches for "${query}" in the workspace.`,
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

export const listWorkspaceFilesTool: AgentTool<
	ListWorkspaceFilesArgs,
	ListWorkspaceFilesResult
> = {
	name: "list_workspace_files",
	description:
		"Lists all files, sizes, and types in the current persistent session workspace. Use this to discover available datasets, generated files, scripts, or attached user documents before processing them.",
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
		"Searches the text/code files in the session workspace for a literal string and returns matching file, line number, and line text. Use this to locate symbols, functions, config keys, or data values across files before reading them in full.",
	parameters: {
		type: "OBJECT",
		properties: {
			query: {
				type: "STRING",
				description:
					"The literal text to search for (case-insensitive by default).",
			},
			filePattern: {
				type: "STRING",
				description:
					"Optional filename glob to limit the search, e.g. '*.py' or 'data*'. Defaults to all text files.",
			},
			maxResults: {
				type: "INTEGER",
				description:
					"Optional maximum number of matches to return (default 50, max 200).",
			},
			caseSensitive: {
				type: "BOOLEAN",
				description: "Optional. Set to true for a case-sensitive search.",
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
	description:
		"Reads the content of a text or code file from the session workspace. Use this to inspect source code, configuration files, CSV headers, schemas, or script outputs.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description:
					"Name of the file in workspace to read (e.g. 'dataset.csv', 'report.txt', 'script.py').",
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
		"Writes or updates a text/code file in the persistent session workspace. Set sendToUser to true if you want the written file delivered directly to the user as a Telegram file attachment.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description:
					"Name of the file to write (e.g. 'clean_data.csv', 'config.json', 'crawler.py').",
			},
			content: {
				type: "STRING",
				description: "Text or code content to write into the file.",
			},
			sendToUser: {
				type: "BOOLEAN",
				description:
					"Optional. Set to true to deliver this file directly to the Telegram user as a document attachment.",
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
		"Makes a targeted edit to an existing text/code file in the session workspace by replacing an exact snippet. Use this instead of rewriting whole files when changing a few lines. old_string must match exactly (including whitespace) and, unless replace_all is true, must be unique in the file.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description: "Name of the existing text/code file to edit.",
			},
			old_string: {
				type: "STRING",
				description:
					"The exact text to find. Include enough surrounding context to be unique.",
			},
			new_string: {
				type: "STRING",
				description: "The text to replace it with.",
			},
			replace_all: {
				type: "BOOLEAN",
				description:
					"Optional. When true, replace every occurrence of old_string instead of requiring a unique match.",
			},
			sendToUser: {
				type: "BOOLEAN",
				description:
					"Optional. Set to true to deliver the updated file to the Telegram user as a document attachment.",
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
		"Delivers an existing workspace file, chart, spreadsheet, or generated media directly to the user as a Telegram document, photo, or video.",
	parameters: {
		type: "OBJECT",
		properties: {
			filename: {
				type: "STRING",
				description:
					"Name of the existing file in the workspace to send to the user (e.g. 'analysis.xlsx', 'chart.png', 'summary.pdf').",
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
	description:
		"Cleans out all files in the current session workspace. Use when starting a completely fresh task or resetting temporary data.",
	parameters: {
		type: "OBJECT",
		properties: {},
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (args: ResetWorkspaceArgs, context?: ToolExecutionContext) => {
		return resetWorkspace(args, context);
	},
};
