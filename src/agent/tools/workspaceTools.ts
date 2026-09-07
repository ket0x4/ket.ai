import { extname } from "node:path";
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
	execute: async (
		args: ListWorkspaceFilesArgs,
		context?: ToolExecutionContext,
	) => {
		return listWorkspaceFiles(args, context);
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
	execute: async (
		args: WriteWorkspaceFileArgs,
		context?: ToolExecutionContext,
	) => {
		return writeWorkspaceFile(args, context);
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
	execute: async (args: ResetWorkspaceArgs, context?: ToolExecutionContext) => {
		return resetWorkspace(args, context);
	},
};
