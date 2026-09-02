import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type { AgentTool, ToolExecutionContext } from "../types";

export interface CodeExecutionProgressEvent {
	type: "status" | "stdout" | "stderr";
	text: string;
	fullStdoutSoFar?: string;
}

export interface CodeExecutionArgs {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	sessionId?: string;
	filename?: string;
	target_files?: string[];
	stream?: boolean;
	onProgress?: (event: CodeExecutionProgressEvent) => void;
}

export type ArtifactType = "image" | "document" | "video" | "audio";

export interface CodeExecutionArtifact {
	filename: string;
	mimeType: string;
	data: string; // base64
	sizeBytes: number;
	type: ArtifactType;
}

export type CodeExecutionImage = CodeExecutionArtifact;

export interface CodeExecutionResult {
	success: boolean;
	stdout: string;
	stderr?: string;
	exit_code: number;
	execution_time_ms: number;
	installed_packages?: string[];
	artifacts?: CodeExecutionArtifact[];
	images?: CodeExecutionImage[];
	error_hint?: string;
	truncated?: boolean;
	error?: string;
	system_note?: string;
}

function buildSystemNote(data: {
	success: boolean;
	artifacts?: CodeExecutionArtifact[];
	images?: CodeExecutionImage[];
	errorHint?: string;
}): string {
	let systemNote = data.success
		? "Code execution succeeded. Use the stdout/output to formulate your final concise reply to the user. Do not pretend you did not run the code."
		: "Code execution finished with errors. You may analyze stderr, correct your script, or provide the user with the best possible answer.";

	const allArtifacts = data.artifacts || data.images || [];
	if (allArtifacts.length > 0) {
		const fileList = allArtifacts
			.map((art) => `${art.filename} (${art.type || "file"})`)
			.join(", ");
		systemNote += ` Generated artifact(s) [${fileList}] will be automatically delivered/displayed to the user in Telegram. Briefly describe or summarize what was created in your reply.`;
	}

	if (data.errorHint) {
		systemNote = `${data.errorHint} | ${systemNote}`;
	}
	return systemNote;
}

function checkConnectionError(errorMessage: string): boolean {
	const lowerMsg = errorMessage.toLowerCase();
	return (
		lowerMsg.includes("econnrefused") ||
		lowerMsg.includes("fetch failed") ||
		lowerMsg.includes("aborterror") ||
		lowerMsg.includes("unable to connect") ||
		lowerMsg.includes("connection refused") ||
		lowerMsg.includes("failed to connect")
	);
}

interface RawSandboxExecutionResponse {
	success: boolean;
	stdout: string;
	stderr?: string;
	exitCode: number;
	executionTimeMs: number;
	installedPackages?: string[];
	artifacts?: CodeExecutionArtifact[];
	images?: CodeExecutionImage[];
	errorHint?: string;
	truncated?: boolean;
	error?: string;
}

interface SseParserState {
	accumulatedStdout: string;
	accumulatedStderr: string;
	finalResult: RawSandboxExecutionResponse | null;
}

function extractSseEventLines(part: string): {
	eventType: string;
	dataText: string;
} {
	let eventType = "message";
	let dataText = "";
	for (const line of part.trim().split("\n")) {
		if (line.startsWith("event: ")) {
			eventType = line.slice(7).trim();
		} else if (line.startsWith("data: ")) {
			dataText = line.slice(6);
		}
	}
	return { eventType, dataText };
}

function handleSseStatusEvent(
	dataText: string,
	state: SseParserState,
	onProgress?: (event: CodeExecutionProgressEvent) => void,
) {
	let message = dataText;
	try {
		const obj = JSON.parse(dataText);
		if (obj.message) message = obj.message;
	} catch {}
	onProgress?.({
		type: "status",
		text: message,
		fullStdoutSoFar: state.accumulatedStdout,
	});
}

function processSseEvent(
	part: string,
	state: SseParserState,
	onProgress?: (event: CodeExecutionProgressEvent) => void,
) {
	if (!part.trim()) return;
	const { eventType, dataText } = extractSseEventLines(part);

	if (eventType === "stdout") {
		state.accumulatedStdout += dataText;
		onProgress?.({
			type: "stdout",
			text: dataText,
			fullStdoutSoFar: state.accumulatedStdout,
		});
	} else if (eventType === "stderr") {
		state.accumulatedStderr += dataText;
		onProgress?.({
			type: "stderr",
			text: dataText,
			fullStdoutSoFar: state.accumulatedStdout,
		});
	} else if (eventType === "status") {
		handleSseStatusEvent(dataText, state, onProgress);
	} else if (eventType === "result") {
		try {
			state.finalResult = JSON.parse(dataText) as RawSandboxExecutionResponse;
		} catch (e) {
			logger.warn("[CodeExecutionTool] Failed to parse result SSE payload:", e);
		}
	}
}

async function parseSseExecutionResponse(
	response: Response,
	onProgress?: (event: CodeExecutionProgressEvent) => void,
): Promise<RawSandboxExecutionResponse> {
	if (!response.body) {
		throw new Error("Sandbox response body is empty");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const state: SseParserState = {
		accumulatedStdout: "",
		accumulatedStderr: "",
		finalResult: null,
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) {
			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split("\n\n");
			buffer = parts.pop() || "";

			for (const part of parts) {
				processSseEvent(part, state, onProgress);
			}
		}
	}

	if (state.finalResult) {
		return state.finalResult;
	}

	return {
		success: state.accumulatedStderr.length === 0,
		stdout: state.accumulatedStdout,
		stderr: state.accumulatedStderr || undefined,
		exitCode: state.accumulatedStderr.length === 0 ? 0 : 1,
		executionTimeMs: 0,
	};
}

async function fetchSandboxExecution(
	targetUrl: string,
	payload: Record<string, unknown>,
	useStreaming: boolean,
	onProgress?: (event: CodeExecutionProgressEvent) => void,
): Promise<RawSandboxExecutionResponse> {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		CONFIG.SANDBOX_TIMEOUT_MS + 5000,
	);

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (useStreaming) {
		headers.Accept = "text/event-stream";
	}

	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text().catch(() => "");
			logger.error(
				`[CodeExecutionTool] Sandbox HTTP error ${response.status}: ${errorText}`,
			);
			return {
				success: false,
				stdout: "",
				stderr: `Sandbox returned HTTP ${response.status}: ${errorText}`,
				exitCode: 1,
				executionTimeMs: 0,
				error: `Sandbox execution failed with HTTP ${response.status}`,
			};
		}

		const isSse = response.headers
			.get("content-type")
			?.includes("text/event-stream");
		return isSse
			? await parseSseExecutionResponse(response, onProgress)
			: ((await response.json()) as RawSandboxExecutionResponse);
	} finally {
		clearTimeout(timeoutId);
	}
}

function formatSandboxResult(
	data: RawSandboxExecutionResponse,
): CodeExecutionResult {
	const artifacts = data.artifacts || data.images || [];
	const images = data.images || artifacts.filter((a) => a.type === "image");

	logger.info(
		`[CodeExecutionTool] Sandbox executed in ${data.executionTimeMs}ms with exit code ${data.exitCode} (artifacts: ${artifacts.length}, images: ${images.length})`,
	);

	return {
		success: data.success,
		stdout: data.stdout || "",
		stderr: data.stderr || undefined,
		exit_code: data.exitCode,
		execution_time_ms: data.executionTimeMs,
		installed_packages: data.installedPackages,
		artifacts,
		images,
		error_hint: data.errorHint,
		truncated: data.truncated,
		error: data.error,
		system_note: buildSystemNote({ ...data, artifacts, images }),
	};
}

/**
 * Executes a code snippet inside the dedicated sandboxed container.
 */
export async function executeInSandbox(
	args: CodeExecutionArgs,
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
			targetUrl,
			{
				language,
				code,
				packages,
				sessionId,
				filename,
				targetFiles,
				stream: useStreaming,
				timeoutMs: CONFIG.SANDBOX_TIMEOUT_MS,
			},
			useStreaming,
			args.onProgress,
		);

		return formatSandboxResult(data);
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		logger.error("[CodeExecutionTool] Failed to connect to sandbox:", err);

		const isConnectionError = checkConnectionError(errorMessage);
		return {
			success: false,
			stdout: "",
			stderr: errorMessage,
			exit_code: 1,
			execution_time_ms: 0,
			error: isConnectionError
				? `Sandbox container is unreachable at ${targetUrl}. Please ensure the ket-sandbox container is running.`
				: `Sandbox execution error: ${errorMessage}`,
			system_note:
				"Execution environment was unreachable. Explain politely to the user that code execution is temporarily unavailable.",
		};
	}
}

export const codeExecutionTool: AgentTool<
	CodeExecutionArgs,
	CodeExecutionResult
> = {
	name: "execute_code",
	description:
		"Executes Python, JavaScript, TypeScript, or Bash scripts in a sandboxed Linux container with web access, persistent workspace files across turns, pre-loaded data science, scraping, media, and reporting packages (numpy, pandas, polars, matplotlib, seaborn, pillow, openpyxl, xlsxwriter, reportlab, tabulate, curl_cffi, beautifulsoup4, requests, ffmpeg, playwright, playwright-stealth). You can generate Excel spreadsheets (.xlsx), PDF documents (.pdf), CSV files (.csv), charts/plots (.png/.jpg), animations/videos (.mp4), or screenshots, and they will automatically be delivered directly to the user as appropriate Telegram photos/documents/videos.",
	parameters: {
		type: "OBJECT",
		properties: {
			language: {
				type: "STRING",
				description:
					"Language to run: 'python', 'javascript', 'typescript', or 'bash'. Default is 'python'.",
			},
			code: {
				type: "STRING",
				description:
					"Complete source code of the script to execute in the sandbox.",
			},
			packages: {
				type: "ARRAY",
				description:
					"Optional list of package dependencies to install before running (e.g. ['requests', 'beautifulsoup4', 'lxml']).",
				items: {
					type: "STRING",
				},
			},
			filename: {
				type: "STRING",
				description:
					"Optional custom filename to save and execute the script as (e.g. 'main.py', 'crawler.ts'). Defaults to standard extension.",
			},
			target_files: {
				type: "ARRAY",
				description:
					"Optional list of specific filenames intended for final delivery to the user (e.g. ['sales_chart.png', 'report.xlsx', 'final_video.mp4']). If specified, intermediate frame/temp files will be excluded.",
				items: {
					type: "STRING",
				},
			},
		},
		required: ["language", "code"],
	},
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

		return executeInSandbox(mergedArgs);
	},
};
