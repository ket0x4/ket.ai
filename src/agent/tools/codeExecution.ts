import { CONFIG } from "../../config";
import {
	isSandboxConnectionError,
	isSandboxTimeoutError,
	sandboxClient,
} from "../../sandbox/client";
import type {
	SandboxExecuteRequest,
	SandboxExecuteResponse,
} from "../../sandbox/contracts";
import logger from "../../utils/logger";
import type { AgentTool, ToolExecutionContext } from "../types";

interface CodeExecutionProgressEvent {
	type: "status" | "stdout" | "stderr";
	text: string;
	fullStdoutSoFar?: string;
}

interface CodeExecutionArgs {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	sessionId?: string;
	filename?: string;
	target_files?: string[];
	timeoutMs?: number;
	stream?: boolean;
	onProgress?: (event: CodeExecutionProgressEvent) => void;
}

type ArtifactType = "image" | "document" | "video" | "audio";

// Mirrors the sandbox server's MAX_TIMEOUT_MS so the model cannot request more
// than the container will allow.
const MAX_EXECUTION_TIMEOUT_MS = 120_000;

interface CodeExecutionArtifact {
	filename: string;
	mimeType: string;
	data: string; // base64
	sizeBytes: number;
	type: ArtifactType;
}

type CodeExecutionImage = CodeExecutionArtifact;

interface CodeExecutionResult {
	execution_id?: string;
	status?: "completed" | "failed" | "cancelled";
	success: boolean;
	stdout: string;
	stderr?: string;
	exit_code: number;
	execution_time_ms: number;
	installed_packages?: string[];
	detected_files?: string[];
	artifacts?: CodeExecutionArtifact[];
	images?: CodeExecutionImage[];
	error_hint?: string;
	truncated?: boolean;
	error?: string;
	notes?: string[];
	system_note?: string;
}

function buildSystemNote(data: {
	success: boolean;
	artifacts?: CodeExecutionArtifact[];
	images?: CodeExecutionImage[];
	errorHint?: string;
	notes?: string[];
}): string | undefined {
	const parts: string[] = [];
	if (data.errorHint) {
		parts.push(data.errorHint);
	}
	const allArtifacts = data.artifacts || data.images || [];
	if (allArtifacts.length > 0) {
		const fileList = allArtifacts
			.map((art) => `${art.filename} (${art.type || "file"})`)
			.join(", ");
		parts.push(
			`Generated workspace file(s): [${fileList}]. Call send_workspace_file({ filename, caption? }) to deliver to user.`,
		);
	}
	if (data.notes && data.notes.length > 0) {
		parts.push(data.notes.join(" "));
	}
	return parts.length > 0 ? parts.join(" | ") : undefined;
}

type RawSandboxExecutionResponse = SandboxExecuteResponse;

async function fetchSandboxExecution(
	payload: SandboxExecuteRequest,
	useStreaming: boolean,
	onProgress?: (event: CodeExecutionProgressEvent) => void,
	signal?: AbortSignal,
): Promise<RawSandboxExecutionResponse> {
	const result = useStreaming
		? await sandboxClient.executeStream(
				payload,
				{
					onEvent: (event) => {
						if (event.type === "status") {
							const data =
								typeof event.data === "object" && event.data
									? (event.data as { message?: string })
									: undefined;
							onProgress?.({
								type: "status",
								text: data?.message || event.text,
							});
						} else if (event.type === "stdout" || event.type === "stderr") {
							onProgress?.({ type: event.type, text: event.text });
						}
					},
				},
				signal,
			)
		: await sandboxClient.execute(payload, signal);
	return result;
}

function formatSandboxResult(
	data: RawSandboxExecutionResponse,
): CodeExecutionResult {
	const allArtifacts = data.artifacts || data.images || [];
	const detectedFiles = allArtifacts.map((a) => a.filename);

	logger.info(
		`[CodeExecutionTool] Sandbox executed in ${data.executionTimeMs}ms with exit code ${data.exitCode} (detected workspace files: ${detectedFiles.length})`,
	);

	return {
		execution_id: data.executionId,
		status: data.status,
		success: data.success,
		stdout: data.stdout || "",
		stderr: data.stderr || undefined,
		exit_code: data.exitCode,
		execution_time_ms: data.executionTimeMs,
		installed_packages: data.installedPackages,
		detected_files: detectedFiles.length > 0 ? detectedFiles : undefined,
		error_hint: data.errorHint,
		truncated: data.truncated,
		error: data.error,
		notes: data.notes,
		system_note: buildSystemNote(data),
	};
}

/**
 * Builds a failure result for the sandbox tool, distinguishing provider-side
 * connection failures from client-side request timeouts.
 */
function buildSandboxFailureResult(
	err: unknown,
	targetUrl: string,
	timeoutMs: number,
): CodeExecutionResult {
	const errorMessage = err instanceof Error ? err.message : String(err);
	const isTimeoutError = isSandboxTimeoutError(err);
	const isConnectionError = !isTimeoutError && isSandboxConnectionError(err);

	const error = isTimeoutError
		? `Sandbox request timed out at the client after ${timeoutMs}ms (the job may still be running in the background). Try splitting the work or increasing timeoutMs.`
		: isConnectionError
			? `Sandbox container is unreachable at ${targetUrl}. Please ensure the ket-sandbox container is running.`
			: `Sandbox execution error: ${errorMessage}`;

	const systemNote = isTimeoutError
		? "The sandbox request timed out before returning a result. Tell the user the job took too long, and consider breaking it into smaller steps."
		: isConnectionError
			? "Execution environment was unreachable. Explain politely to the user that code execution is temporarily unavailable."
			: undefined;

	return {
		success: false,
		stdout: "",
		stderr: errorMessage,
		exit_code: isTimeoutError ? 124 : 1,
		execution_time_ms: 0,
		error,
		system_note: systemNote,
	};
}

/**
 * Executes a code snippet inside the dedicated sandboxed container.
 */
async function executeInSandbox(
	args: CodeExecutionArgs,
	signal?: AbortSignal,
): Promise<CodeExecutionResult> {
	const language = (args.language || "python").toLowerCase();
	const code = args.code || "";
	const packages = Array.isArray(args.packages) ? args.packages : [];
	const sessionId = args.sessionId;
	const filename = args.filename;
	const targetFiles = Array.isArray(args.target_files)
		? args.target_files
		: undefined;
	const useStreaming = Boolean(args.onProgress || args.stream);

	const requestedTimeout = Number(args.timeoutMs);
	const timeoutMs =
		Number.isFinite(requestedTimeout) && requestedTimeout > 0
			? Math.min(requestedTimeout, MAX_EXECUTION_TIMEOUT_MS)
			: CONFIG.SANDBOX_TIMEOUT_MS;

	if (!code.trim()) {
		return {
			success: false,
			stdout: "",
			stderr: "No code provided to execute.",
			exit_code: 1,
			execution_time_ms: 0,
			error: "Empty code string.",
		};
	}

	const sandboxUrl = CONFIG.SANDBOX_URL.replace(/\/+$/, "");
	const targetUrl = `${sandboxUrl}/execute`;

	logger.info(
		`[CodeExecutionTool] Sending ${language} code (${code.length} chars, ${packages.length} packages, session: ${sessionId || "ephemeral"}, stream: ${useStreaming}) to sandbox at ${targetUrl}...`,
	);

	try {
		const data = await fetchSandboxExecution(
			{
				language: language as "python" | "javascript" | "typescript" | "bash",
				code,
				packages,
				sessionId,
				filename,
				targetFiles,
				stream: useStreaming,
				timeoutMs,
			},
			useStreaming,
			args.onProgress,
			signal,
		);

		return formatSandboxResult(data);
	} catch (err: unknown) {
		logger.error("[CodeExecutionTool] Failed to connect to sandbox:", err);
		return buildSandboxFailureResult(err, targetUrl, timeoutMs);
	}
}

export const codeExecutionTool: AgentTool<
	CodeExecutionArgs,
	CodeExecutionResult
> = {
	name: "execute_code",
	description:
		"Run Python, JS, TS, or Bash in the Linux sandbox (has internet, workspace files, data/media/scraping libs).",
	parameters: {
		type: "OBJECT",
		properties: {
			language: {
				type: "STRING",
				description: "'python', 'javascript', 'typescript', or 'bash'.",
			},
			code: {
				type: "STRING",
				description: "Code to run.",
			},
			packages: {
				type: "ARRAY",
				description: "Optional packages to install.",
				items: {
					type: "STRING",
				},
			},
			filename: {
				type: "STRING",
				description: "Optional script filename.",
			},
		},
		required: ["language", "code"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (args: CodeExecutionArgs, context?: ToolExecutionContext) => {
		const mergedArgs: CodeExecutionArgs = { ...args };

		// Security: context.sessionId is authoritative from authenticated bot session
		mergedArgs.sessionId = context?.sessionId || mergedArgs.sessionId;

		if (context?.onProgress && !mergedArgs.onProgress) {
			mergedArgs.onProgress = (event) => {
				context.onProgress?.({
					type: event.type,
					statusText: event.type === "status" ? event.text : undefined,
					stdoutSnippet:
						event.type === "stdout" || event.type === "stderr"
							? event.text
							: undefined,
					fullStdout: event.fullStdoutSoFar,
				});
			};
		}

		return executeInSandbox(mergedArgs, context?.signal);
	},
};

interface BashExecutionArgs {
	command: string;
	sessionId?: string;
	timeoutMs?: number;
}

export const bashExecutionTool: AgentTool<
	BashExecutionArgs,
	CodeExecutionResult
> = {
	name: "execute_bash",
	description: "Run a Bash command in the sandbox workspace.",
	parameters: {
		type: "OBJECT",
		properties: {
			command: {
				type: "STRING",
				description: "Bash command.",
			},
		},
		required: ["command"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_CODE_EXECUTION),
	execute: async (args: BashExecutionArgs, context?: ToolExecutionContext) => {
		return codeExecutionTool.execute(
			{
				language: "bash",
				code: args.command,
				sessionId: args.sessionId,
				timeoutMs: args.timeoutMs,
			},
			context,
		);
	},
};
