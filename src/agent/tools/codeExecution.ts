import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type { AgentTool } from "../types";

export interface CodeExecutionArgs {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	sessionId?: string;
	filename?: string;
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
		? "Code execution succeeded. Use the output to formulate your final concise reply."
		: "Code execution finished with errors. You may analyze the stderr or give the user the best possible answer.";

	const allArtifacts = data.artifacts || data.images || [];
	if (allArtifacts.length > 0) {
		const fileList = allArtifacts
			.map((art) => `${art.filename} (${art.type || "file"})`)
			.join(", ");
		systemNote += ` Generated artifact(s) [${fileList}] will be automatically delivered/displayed to the user. Describe or summarize the findings in your reply.`;
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
		`[CodeExecutionTool] Sending ${language} code (${code.length} chars, ${packages.length} packages, session: ${sessionId || "ephemeral"}) to sandbox at ${targetUrl}...`,
	);

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			CONFIG.SANDBOX_TIMEOUT_MS + 5000,
		);

		const response = await fetch(targetUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language,
				code,
				packages,
				sessionId,
				filename,
				timeoutMs: CONFIG.SANDBOX_TIMEOUT_MS,
			}),
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
				exit_code: 1,
				execution_time_ms: 0,
				error: `Sandbox execution failed with HTTP ${response.status}`,
			};
		}

		const data = (await response.json()) as {
			success: boolean;
			stdout: string;
			stderr: string;
			exitCode: number;
			executionTimeMs: number;
			installedPackages?: string[];
			artifacts?: CodeExecutionArtifact[];
			images?: CodeExecutionImage[];
			errorHint?: string;
			truncated?: boolean;
			error?: string;
		};

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
		},
		required: ["language", "code"],
	},
	execute: async (args: CodeExecutionArgs) => {
		return executeInSandbox(args);
	},
};
