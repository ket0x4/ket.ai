import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

interface ExecuteRequest {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	timeoutMs?: number;
	sessionId?: string;
	filename?: string;
	targetFiles?: string[];
	stream?: boolean;
}

export type ArtifactType = "image" | "document" | "video" | "audio";

export interface GeneratedArtifact {
	filename: string;
	mimeType: string;
	data: string; // base64
	sizeBytes: number;
	type: ArtifactType;
}

export type GeneratedImage = GeneratedArtifact;

interface ExecuteResponse {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
	executionTimeMs: number;
	error?: string;
	errorHint?: string;
	installedPackages?: string[];
	artifacts?: GeneratedArtifact[];
	images?: GeneratedArtifact[];
	truncated?: boolean;
}

interface WorkspaceFileEntry {
	filename: string;
	sizeBytes: number;
	modifiedAt: string;
	isImage: boolean;
	artifactType?: ArtifactType;
}

const PORT = Number(process.env.SANDBOX_PORT || 8080);
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB
const MAX_ARTIFACT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per artifact
const MAX_ARTIFACTS_COUNT = 5; // Standardized to max 5 artifacts
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (backward compatibility)
const MAX_IMAGES_COUNT = 5;
const MAX_SESSION_DIR_BYTES = 50 * 1024 * 1024; // 50 MB
const SANDBOX_BASE_DIR = process.env.SANDBOX_BASE_DIR || "/tmp/sandboxes";
const SAFE_SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

// Ensure base sandbox directory exists
if (!existsSync(SANDBOX_BASE_DIR)) {
	try {
		mkdirSync(SANDBOX_BASE_DIR, { recursive: true });
	} catch (e) {
		console.error("Failed to create base sandbox directory:", e);
	}
}

// Package name validation regex to prevent command injection
const SAFE_PKG_REGEX = /^[a-zA-Z0-9_.-]+(?:[=<>!~]+[a-zA-Z0-9_.-]+)?$/;

function sanitizePackages(packages?: string[]): string[] {
	if (!Array.isArray(packages)) return [];
	return packages
		.map((p) => (typeof p === "string" ? p.trim() : ""))
		.filter((p) => p.length > 0 && SAFE_PKG_REGEX.test(p));
}

function resolveWorkspace(sessionId?: string): {
	workspaceDir: string;
	isPersistent: boolean;
} {
	if (sessionId && SAFE_SESSION_ID_REGEX.test(sessionId)) {
		const dir = join(SANDBOX_BASE_DIR, `session_${sessionId}`);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		return { workspaceDir: dir, isPersistent: true };
	}
	const execId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	const dir = join(SANDBOX_BASE_DIR, execId);
	mkdirSync(dir, { recursive: true });
	return { workspaceDir: dir, isPersistent: false };
}

function resolveSafePath(workspaceDir: string, relativePath: string): string {
	const clean = relativePath.trim().replace(/^(\.\.(\/|\\|$))+/, "");
	const normalizedWorkspace = resolve(workspaceDir);
	const targetPath = resolve(normalizedWorkspace, clean);
	const rel = relative(normalizedWorkspace, targetPath);

	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(
			"Access denied: Path traversal outside workspace is forbidden.",
		);
	}
	return targetPath;
}

function getDirectorySizeBytes(dirPath: string): number {
	let total = 0;
	try {
		const entries = readdirSync(dirPath);
		for (const entry of entries) {
			const fullPath = join(dirPath, entry);
			const stats = statSync(fullPath);
			if (stats.isFile()) {
				total += stats.size;
			} else if (stats.isDirectory() && entry !== "node_modules") {
				total += getDirectorySizeBytes(fullPath);
			}
		}
	} catch {}
	return total;
}

/**
 * Captures snapshot of existing files in the workspace directory before execution.
 */
function getWorkspaceSnapshot(
	workspaceDir: string,
): Map<string, { size: number; mtimeMs: number }> {
	const map = new Map<string, { size: number; mtimeMs: number }>();
	try {
		if (!existsSync(workspaceDir)) return map;
		const entries = readdirSync(workspaceDir);
		for (const file of entries) {
			try {
				const filePath = join(workspaceDir, file);
				const stats = statSync(filePath);
				if (stats.isFile()) {
					map.set(file, { size: stats.size, mtimeMs: stats.mtimeMs });
				}
			} catch {}
		}
	} catch {}
	return map;
}

function truncateOutput(output: string): { text: string; truncated: boolean } {
	if (Buffer.byteLength(output, "utf-8") > MAX_OUTPUT_BYTES) {
		const truncated = output.slice(0, MAX_OUTPUT_BYTES);
		return {
			text: `${truncated}\n\n[... output truncated due to 64KB limit ...]`,
			truncated: true,
		};
	}
	return { text: output, truncated: false };
}

/**
 * Returns a sanitized, minimal environment to isolate untrusted scripts
 * and prevent leaking host secrets (API keys, bot tokens, DB configs).
 */
function getSafeEnv(): Record<string, string> {
	return {
		PATH:
			process.env.PATH ||
			"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
		LANG: process.env.LANG || "C.UTF-8",
		LC_ALL: process.env.LC_ALL || "C.UTF-8",
		TZ: process.env.TZ || "Europe/Istanbul",
		HOME: process.env.HOME || "/home/sandboxuser",
		USER: process.env.USER || "sandboxuser",
		TMPDIR: "/tmp",
		PYTHONUNBUFFERED: "1",
		MPLBACKEND: "Agg",
		PLAYWRIGHT_BROWSERS_PATH:
			process.env.PLAYWRIGHT_BROWSERS_PATH || "/ms-playwright",
		PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:
			process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
			"/usr/bin/chromium-browser",
		CHROME_BIN: process.env.CHROME_BIN || "/usr/bin/chromium-browser",
	};
}

const ARTIFACT_MIME_MAP: Record<string, { mimeType: string; type: ArtifactType }> = {
	// Images
	".png": { mimeType: "image/png", type: "image" },
	".jpg": { mimeType: "image/jpeg", type: "image" },
	".jpeg": { mimeType: "image/jpeg", type: "image" },
	".webp": { mimeType: "image/webp", type: "image" },
	".svg": { mimeType: "image/svg+xml", type: "image" },
	".gif": { mimeType: "image/gif", type: "image" },

	// Documents & Spreadsheets
	".xlsx": {
		mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		type: "document",
	},
	".xls": { mimeType: "application/vnd.ms-excel", type: "document" },
	".csv": { mimeType: "text/csv", type: "document" },
	".tsv": { mimeType: "text/tab-separated-values", type: "document" },
	".pdf": { mimeType: "application/pdf", type: "document" },
	".docx": {
		mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		type: "document",
	},
	".pptx": {
		mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
		type: "document",
	},
	".zip": { mimeType: "application/zip", type: "document" },
	".tar": { mimeType: "application/x-tar", type: "document" },
	".gz": { mimeType: "application/gzip", type: "document" },
	".json": { mimeType: "application/json", type: "document" },
	".parquet": { mimeType: "application/octet-stream", type: "document" },
	".txt": { mimeType: "text/plain", type: "document" },

	// Video & Animations
	".mp4": { mimeType: "video/mp4", type: "video" },
	".webm": { mimeType: "video/webm", type: "video" },
	".mkv": { mimeType: "video/x-matroska", type: "video" },
	".avi": { mimeType: "video/x-msvideo", type: "video" },

	// Audio
	".mp3": { mimeType: "audio/mpeg", type: "audio" },
	".wav": { mimeType: "audio/wav", type: "audio" },
	".ogg": { mimeType: "audio/ogg", type: "audio" },
	".m4a": { mimeType: "audio/mp4", type: "audio" },
	".aac": { mimeType: "audio/aac", type: "audio" },
};

function isIntermediateArtifact(filename: string): boolean {
	const lower = filename.toLowerCase();
	if (
		lower.startsWith("temp_") ||
		lower.startsWith("tmp_") ||
		lower.endsWith(".tmp") ||
		lower.endsWith(".bak")
	) {
		return true;
	}
	if (
		lower.startsWith("frame_") &&
		(lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp"))
	) {
		return true;
	}
	return false;
}

/**
 * Scans the workspace directory for generated artifacts using delta snapshotting and intent filtering.
 */
function detectGeneratedArtifacts(
	workspaceDir: string,
	ignoredFileNames: string[] = [],
	beforeSnapshot?: Map<string, { size: number; mtimeMs: number }>,
	targetFiles?: string[],
): GeneratedArtifact[] {
	const artifacts: GeneratedArtifact[] = [];
	const targetSet =
		Array.isArray(targetFiles) && targetFiles.length > 0
			? new Set(
					targetFiles
						.map((f) => (typeof f === "string" ? f.trim().toLowerCase() : ""))
						.filter(Boolean),
				)
			: null;

	try {
		const entries = readdirSync(workspaceDir);
		const candidateFiles: Array<{
			file: string;
			stats: ReturnType<typeof statSync>;
			ext: string;
			entry: { mimeType: string; type: ArtifactType };
			isExplicit: boolean;
		}> = [];

		for (const file of entries) {
			if (ignoredFileNames.includes(file) || file.startsWith(".")) continue;

			const isExplicit = Boolean(targetSet?.has(file.toLowerCase()));

			// If not explicitly requested, filter out intermediate frame / temp files
			if (!isExplicit && isIntermediateArtifact(file)) continue;

			const filePath = join(workspaceDir, file);
			try {
				const stats = statSync(filePath);
				if (!stats.isFile()) continue;

				// Delta check: only consider newly created or modified files in this run
				if (beforeSnapshot && beforeSnapshot.has(file)) {
					const prev = beforeSnapshot.get(file)!;
					// If size and mtime are identical, it was not created/modified in this turn
					if (stats.size === prev.size && stats.mtimeMs <= prev.mtimeMs) {
						continue;
					}
				}

				const ext = extname(file).toLowerCase();
				const entry = ARTIFACT_MIME_MAP[ext];
				if (entry && stats.size > 0 && stats.size <= MAX_ARTIFACT_SIZE_BYTES) {
					candidateFiles.push({ file, stats, ext, entry, isExplicit });
				}
			} catch (err) {
				console.warn(`[Sandbox] Failed to read potential artifact ${file}:`, err);
			}
		}

		// Check if any video was generated in this turn
		const hasVideo = candidateFiles.some((c) => c.entry.type === "video");

		for (const item of candidateFiles) {
			// If targetFiles was specified and this file is not in targetFiles, skip
			if (targetSet && !item.isExplicit) {
				continue;
			}

			// If a video was generated and targetFiles was not explicitly set, omit images (which are usually frames)
			if (hasVideo && !item.isExplicit && item.entry.type === "image") {
				continue;
			}

			const fileBuffer = readFileSync(join(workspaceDir, item.file));
			artifacts.push({
				filename: item.file,
				mimeType: item.entry.mimeType,
				type: item.entry.type,
				data: fileBuffer.toString("base64"),
				sizeBytes: item.stats.size,
			});

			if (artifacts.length >= MAX_ARTIFACTS_COUNT) break;
		}
	} catch (err) {
		console.warn(`[Sandbox] Error scanning workspace for artifacts:`, err);
	}
	return artifacts;
}

/**
 * Backward compatibility alias for image detection.
 */
function detectGeneratedImages(
	workspaceDir: string,
	ignoredFileNames: string[] = [],
	beforeSnapshot?: Map<string, { size: number; mtimeMs: number }>,
	targetFiles?: string[],
): GeneratedImage[] {
	return detectGeneratedArtifacts(
		workspaceDir,
		ignoredFileNames,
		beforeSnapshot,
		targetFiles,
	).filter((a) => a.type === "image");
}

/**
 * Parses stderr and exit code to provide intelligent self-healing hints for the LLM agent.
 */
function generateErrorHint(
	stderr: string,
	exitCode: number,
): string | undefined {
	if (exitCode === 0 && !stderr) return undefined;

	// 1. Missing Python module
	const moduleMatch = stderr.match(
		/ModuleNotFoundError: No module named '([a-zA-Z0-9_.-]+)'/,
	);
	if (moduleMatch) {
		return `Hint: Python module '${moduleMatch[1]}' is missing. You can pass packages: ['${moduleMatch[1]}'] in your tool arguments to auto-install it.`;
	}

	// 2. Missing JS/TS package
	const jsModuleMatch = stderr.match(
		/(?:Cannot find module|Cannot find package) '([a-zA-Z0-9_@/.-]+)'/,
	);
	if (jsModuleMatch) {
		return `Hint: Package '${jsModuleMatch[1]}' is missing. You can pass packages: ['${jsModuleMatch[1]}'] in your tool arguments to auto-install it.`;
	}

	// 3. Syntax error
	const syntaxMatch = stderr.match(/SyntaxError: (.*)/);
	if (syntaxMatch) {
		return `Hint: Python SyntaxError detected (${syntaxMatch[1]}). Please verify your script syntax and indentation.`;
	}

	// 4. Timeout & Playwright Timeout
	if (
		exitCode === 124 ||
		stderr.includes("timed out") ||
		stderr.includes("TimeoutError: Page.goto") ||
		stderr.includes("TimeoutError: Locator") ||
		stderr.includes("playwright._impl._errors.TimeoutError")
	) {
		if (
			stderr.includes("playwright") ||
			stderr.includes("Locator") ||
			stderr.includes("Page.goto") ||
			stderr.includes("waiting for locator")
		) {
			return "Hint: Playwright page navigation or selector wait timed out. Consider using wait_until='domcontentloaded', increasing timeout, or checking if target selectors are present.";
		}
		return "Hint: Script execution timed out. If performing web scraping or heavy computation, consider reducing loops or queries.";
	}

	// 5. Anti-Bot / HTTP 403 / 429 / Cloudflare
	if (
		stderr.includes("403 Forbidden") ||
		stderr.includes("HTTPError: 403") ||
		stderr.includes("429 Too Many Requests") ||
		stderr.includes("Cloudflare") ||
		stderr.includes("Just a moment...") ||
		stderr.includes("Enable JavaScript and cookies to continue")
	) {
		return "Hint: Target website blocked the request (403/429/Cloudflare Bot Protection). Try using 'curl_cffi' (with impersonate='chrome') or 'playwright' with stealth mode and realistic browser headers instead of standard requests.";
	}

	// 6. JSON / Data Parsing / KeyError / IndexError
	if (
		stderr.includes("JSONDecodeError") ||
		stderr.includes("Unexpected token < in JSON") ||
		stderr.includes("SyntaxError: Unexpected token")
	) {
		return "Hint: JSON parsing failed. The server likely returned an HTML error or captcha page instead of JSON. Print and inspect the raw response body first.";
	}
	if (stderr.match(/KeyError: (.*)/)) {
		return "Hint: KeyError detected. The dictionary key does not exist. Use dict.get('key') with a default fallback or inspect available keys with print(data.keys()).";
	}
	if (stderr.includes("IndexError: list index out of range")) {
		return "Hint: IndexError detected. The parsed list or elements array is empty. Verify that your CSS/XPath selector or regex actually matched elements.";
	}

	// 7. FileNotFoundError
	if (
		stderr.includes("FileNotFoundError") ||
		stderr.includes("ENOENT: no such file or directory")
	) {
		return "Hint: File or directory was not found. Use list_workspace_files to see existing files or write output files using relative paths.";
	}

	// 8. NameError
	const nameMatch = stderr.match(
		/NameError: name '([a-zA-Z0-9_]+)' is not defined/,
	);
	if (nameMatch) {
		return `Hint: Variable or function '${nameMatch[1]}' is not defined before use.`;
	}

	// 9. Memory limit / OOM
	if (
		exitCode === 137 ||
		stderr.includes("MemoryError") ||
		stderr.includes("heap out of memory")
	) {
		return "Hint: Process exceeded memory quota (1.5GB) and was terminated. Process data in chunks (e.g. chunksize in pandas/polars) to avoid loading entire datasets into memory.";
	}

	return undefined;
}

async function streamReader(
	stream: ReadableStream<Uint8Array>,
	onChunk?: (chunk: string) => void,
): Promise<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let accumulated = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				const text = decoder.decode(value, { stream: true });
				accumulated += text;
				if (onChunk) {
					try {
						onChunk(text);
					} catch {}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
	return accumulated;
}

async function runCommand(
	cmd: string[],
	cwd: string,
	timeoutMs: number,
	onStdoutChunk?: (chunk: string) => void,
	onStderrChunk?: (chunk: string) => void,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(cmd, {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: getSafeEnv(),
	});

	let timer: Timer | undefined;

	const timeoutPromise = new Promise<{
		stdout: string;
		stderr: string;
		exitCode: number;
	}>((resolve) => {
		timer = setTimeout(() => {
			try {
				proc.kill(9);
			} catch {}
			resolve({
				stdout: "",
				stderr: `Execution timed out after ${timeoutMs}ms.`,
				exitCode: 124,
			});
		}, timeoutMs);
	});

	const executionPromise = (async () => {
		try {
			const [stdoutText, stderrText] = await Promise.all([
				streamReader(proc.stdout, onStdoutChunk),
				streamReader(proc.stderr, onStderrChunk),
			]);
			const exitCode = await proc.exited;
			if (timer) clearTimeout(timer);

			return {
				stdout: stdoutText,
				stderr: stderrText,
				exitCode,
			};
		} catch (err) {
			if (timer) clearTimeout(timer);
			return {
				stdout: "",
				stderr: `Process error: ${err instanceof Error ? err.message : String(err)}`,
				exitCode: 1,
			};
		}
	})();

	return Promise.race([executionPromise, timeoutPromise]);
}

function resolveScriptCommand(
	normalizedLang: string,
	customFilename?: string,
): { scriptFileName: string; execCommand: string[] } {
	if (normalizedLang === "javascript") {
		const scriptFileName = customFilename || "script.mjs";
		return { scriptFileName, execCommand: ["bun", "run", scriptFileName] };
	}
	if (normalizedLang === "typescript") {
		const scriptFileName = customFilename || "script.ts";
		return { scriptFileName, execCommand: ["bun", "run", scriptFileName] };
	}
	if (normalizedLang === "bash" || normalizedLang === "sh") {
		const scriptFileName = customFilename || "script.sh";
		return { scriptFileName, execCommand: ["bash", scriptFileName] };
	}
	const scriptFileName = customFilename || "script.py";
	return { scriptFileName, execCommand: ["python3", scriptFileName] };
}

async function handleExecute(req: Request): Promise<Response> {
	let body: ExecuteRequest;
	try {
		body = (await req.json()) as ExecuteRequest;
	} catch {
		return Response.json(
			{ success: false, error: "Invalid JSON request body" },
			{ status: 400 },
		);
	}

	const { language, code, sessionId, filename, targetFiles } = body;
	if (!code || typeof code !== "string") {
		return Response.json(
			{ success: false, error: "Missing or invalid 'code' string parameter" },
			{ status: 400 },
		);
	}

	const normalizedLang = (language || "python").toLowerCase();
	if (
		!["python", "javascript", "typescript", "bash", "sh"].includes(
			normalizedLang,
		)
	) {
		return Response.json(
			{
				success: false,
				error: `Unsupported language '${language}'. Supported: python, javascript, typescript, bash`,
			},
			{ status: 400 },
		);
	}

	const timeout = Math.min(
		Math.max(Number(body.timeoutMs) || DEFAULT_TIMEOUT_MS, 1000),
		MAX_TIMEOUT_MS,
	);
	const packages = sanitizePackages(body.packages);
	const { workspaceDir, isPersistent } = resolveWorkspace(sessionId);

	// Quota check
	if (getDirectorySizeBytes(workspaceDir) > MAX_SESSION_DIR_BYTES) {
		return Response.json(
			{
				success: false,
				error:
					"Session workspace disk quota exceeded (50MB). Please reset the workspace.",
			},
			{ status: 413 },
		);
	}

	const isStreaming =
		Boolean(body.stream) ||
		req.headers.get("accept")?.includes("text/event-stream") === true;

	const startTime = Date.now();
	let packageInstallStderr = "";
	const installedPackages: string[] = [];

	if (isStreaming) {
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const sendEvent = (event: string, data: unknown) => {
					try {
						const payload =
							typeof data === "string" ? data : JSON.stringify(data);
						controller.enqueue(
							encoder.encode(`event: ${event}\ndata: ${payload}\n\n`),
						);
					} catch {}
				};

				try {
					// Step 1: Install packages if requested
					if (packages.length > 0) {
						sendEvent("status", {
							stage: "installing",
							message: `Installing packages: ${packages.join(", ")}...`,
						});
						let installCmd: string[] = [];

						if (normalizedLang === "python") {
							installCmd = [
								"pip",
								"install",
								"--cache-dir",
								"/home/sandboxuser/.cache/pip",
								...packages,
							];
						} else if (
							normalizedLang === "javascript" ||
							normalizedLang === "typescript"
						) {
							installCmd = ["bun", "add", ...packages];
						}

						if (installCmd.length > 0) {
							const pkgResult = await runCommand(
								installCmd,
								workspaceDir,
								60_000,
								(chunk) => sendEvent("stdout", chunk),
								(chunk) => sendEvent("stderr", chunk),
							);
							if (pkgResult.exitCode !== 0) {
								console.warn(
									`[Sandbox:${workspaceDir}] Package install warning / error:`,
									pkgResult.stderr,
								);
								packageInstallStderr = `Package installation warning:\n${pkgResult.stderr}\n`;
								sendEvent("status", {
									stage: "install_warning",
									message: `Package install warning: ${pkgResult.stderr.slice(0, 200)}`,
								});
							} else {
								installedPackages.push(...packages);
								sendEvent("status", {
									stage: "install_success",
									message: `Packages installed successfully: ${packages.join(", ")}`,
								});
							}
						}
					}

					// Step 2: Take snapshot of existing files in workspace before execution
					const beforeSnapshot = getWorkspaceSnapshot(workspaceDir);

					// Step 3: Write script file
					const { scriptFileName, execCommand } = resolveScriptCommand(
						normalizedLang,
						filename,
					);
					const scriptPath = resolveSafePath(workspaceDir, scriptFileName);
					writeFileSync(scriptPath, code, "utf-8");

					// Step 4: Execute script with live stream
					sendEvent("status", {
						stage: "executing",
						message: `Executing ${normalizedLang} script (${scriptFileName})...`,
					});

					const result = await runCommand(
						execCommand,
						workspaceDir,
						timeout,
						(chunk) => sendEvent("stdout", chunk),
						(chunk) => sendEvent("stderr", chunk),
					);
					const durationMs = Date.now() - startTime;

					const totalStderr = packageInstallStderr
						? `${packageInstallStderr}\n${result.stderr}`
						: result.stderr;

					sendEvent("status", {
						stage: "detecting_artifacts",
						message: "Scanning workspace for generated files, charts, and media...",
					});

					// Detect any artifacts generated specifically by this script execution
					const generatedArtifacts = detectGeneratedArtifacts(
						workspaceDir,
						[scriptFileName, "package.json", "bun.lock", ".session_meta.json"],
						beforeSnapshot,
						targetFiles,
					);
					const generatedImages = generatedArtifacts.filter(
						(a) => a.type === "image",
					);

					const stdoutTruncated = truncateOutput(result.stdout);
					const stderrTruncated = truncateOutput(totalStderr);
					const errorHint = generateErrorHint(totalStderr, result.exitCode);

					// Save session metadata for continuity
					if (isPersistent) {
						try {
							const metaPath = join(workspaceDir, ".session_meta.json");
							writeFileSync(
								metaPath,
								JSON.stringify(
									{
										lastLanguage: normalizedLang,
										lastScriptFile: scriptFileName,
										lastExitCode: result.exitCode,
										lastExecutionTimeMs: durationMs,
										lastStderrSnippet: totalStderr.slice(0, 500),
										lastStdoutSnippet: result.stdout.slice(0, 500),
										lastExecutedAt: new Date().toISOString(),
										errorHint,
									},
									null,
									2,
								),
								"utf-8",
							);
						} catch {}
					}

					const responsePayload: ExecuteResponse = {
						success: result.exitCode === 0,
						stdout: stdoutTruncated.text,
						stderr: stderrTruncated.text,
						exitCode: result.exitCode,
						executionTimeMs: durationMs,
						installedPackages,
						artifacts:
							generatedArtifacts.length > 0 ? generatedArtifacts : undefined,
						images:
							generatedImages.length > 0 ? generatedImages : undefined,
						errorHint,
						truncated: stdoutTruncated.truncated || stderrTruncated.truncated,
					};

					sendEvent("result", responsePayload);
				} catch (error) {
					const durationMs = Date.now() - startTime;
					const errMessage =
						error instanceof Error ? error.message : String(error);
					console.error(`[Sandbox:${workspaceDir}] Streaming execution exception:`, error);
					sendEvent("result", {
						success: false,
						stdout: "",
						stderr: errMessage,
						exitCode: 1,
						executionTimeMs: durationMs,
						error: errMessage,
					});
				} finally {
					// Clean up isolated temporary workspace
					if (!isPersistent) {
						try {
							rmSync(workspaceDir, { recursive: true, force: true });
						} catch (cleanupErr) {
							console.warn(
								`[Sandbox:${workspaceDir}] Failed to clean up workspace:`,
								cleanupErr,
							);
						}
					}
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}

	try {
		// Step 1: Install packages if requested
		if (packages.length > 0) {
			console.log(
				`[Sandbox:${workspaceDir}] Installing packages: ${packages.join(", ")}`,
			);
			let installCmd: string[] = [];

			if (normalizedLang === "python") {
				installCmd = [
					"pip",
					"install",
					"--cache-dir",
					"/home/sandboxuser/.cache/pip",
					...packages,
				];
			} else if (
				normalizedLang === "javascript" ||
				normalizedLang === "typescript"
			) {
				installCmd = ["bun", "add", ...packages];
			}

			if (installCmd.length > 0) {
				const pkgResult = await runCommand(installCmd, workspaceDir, 60_000);
				if (pkgResult.exitCode !== 0) {
					console.warn(
						`[Sandbox:${workspaceDir}] Package install warning / error:`,
						pkgResult.stderr,
					);
					packageInstallStderr = `Package installation warning:\n${pkgResult.stderr}\n`;
				} else {
					installedPackages.push(...packages);
				}
			}
		}

		// Step 2: Take snapshot of existing files in workspace before execution
		const beforeSnapshot = getWorkspaceSnapshot(workspaceDir);

		// Step 3: Write script file
		const { scriptFileName, execCommand } = resolveScriptCommand(
			normalizedLang,
			filename,
		);
		const scriptPath = resolveSafePath(workspaceDir, scriptFileName);
		writeFileSync(scriptPath, code, "utf-8");

		// Step 4: Execute script
		console.log(
			`[Sandbox:${workspaceDir}] Executing ${normalizedLang} script (${scriptFileName}, timeout: ${timeout}ms)...`,
		);
		const result = await runCommand(execCommand, workspaceDir, timeout);
		const durationMs = Date.now() - startTime;

		const totalStderr = packageInstallStderr
			? `${packageInstallStderr}\n${result.stderr}`
			: result.stderr;

		// Detect any artifacts generated specifically by this script execution
		const generatedArtifacts = detectGeneratedArtifacts(
			workspaceDir,
			[scriptFileName, "package.json", "bun.lock", ".session_meta.json"],
			beforeSnapshot,
			targetFiles,
		);
		const generatedImages = generatedArtifacts.filter((a) => a.type === "image");

		const stdoutTruncated = truncateOutput(result.stdout);
		const stderrTruncated = truncateOutput(totalStderr);
		const errorHint = generateErrorHint(totalStderr, result.exitCode);

		// Save session metadata for continuity
		if (isPersistent) {
			try {
				const metaPath = join(workspaceDir, ".session_meta.json");
				writeFileSync(
					metaPath,
					JSON.stringify(
						{
							lastLanguage: normalizedLang,
							lastScriptFile: scriptFileName,
							lastExitCode: result.exitCode,
							lastExecutionTimeMs: durationMs,
							lastStderrSnippet: totalStderr.slice(0, 500),
							lastStdoutSnippet: result.stdout.slice(0, 500),
							lastExecutedAt: new Date().toISOString(),
							errorHint,
						},
						null,
						2,
					),
					"utf-8",
				);
			} catch {}
		}

		const responsePayload: ExecuteResponse = {
			success: result.exitCode === 0,
			stdout: stdoutTruncated.text,
			stderr: stderrTruncated.text,
			exitCode: result.exitCode,
			executionTimeMs: durationMs,
			installedPackages,
			artifacts: generatedArtifacts.length > 0 ? generatedArtifacts : undefined,
			images: generatedImages.length > 0 ? generatedImages : undefined,
			errorHint,
			truncated: stdoutTruncated.truncated || stderrTruncated.truncated,
		};

		return Response.json(responsePayload);
	} catch (error) {
		const durationMs = Date.now() - startTime;
		const errMessage = error instanceof Error ? error.message : String(error);
		console.error(`[Sandbox:${workspaceDir}] Execution exception:`, error);
		return Response.json(
			{
				success: false,
				stdout: "",
				stderr: errMessage,
				exitCode: 1,
				executionTimeMs: durationMs,
				error: errMessage,
			},
			{ status: 500 },
		);
	} finally {
		// Clean up isolated temporary workspace (keep persistent session directories)
		if (!isPersistent) {
			try {
				rmSync(workspaceDir, { recursive: true, force: true });
			} catch (cleanupErr) {
				console.warn(
					`[Sandbox:${workspaceDir}] Failed to clean up workspace:`,
					cleanupErr,
				);
			}
		}
	}
}

async function handleWorkspaceRead(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { sessionId?: string; filename?: string };
		const { sessionId, filename } = body;
		if (!sessionId || !filename) {
			return Response.json(
				{ success: false, error: "Missing 'sessionId' or 'filename'" },
				{ status: 400 },
			);
		}

		const { workspaceDir } = resolveWorkspace(sessionId);
		const targetPath = resolveSafePath(workspaceDir, filename);

		if (!existsSync(targetPath)) {
			return Response.json(
				{ success: false, error: `File '${filename}' not found in workspace.` },
				{ status: 404 },
			);
		}

		const stats = statSync(targetPath);
		if (!stats.isFile()) {
			return Response.json(
				{ success: false, error: `'${filename}' is not a file.` },
				{ status: 400 },
			);
		}

		const content = readFileSync(targetPath, "utf-8");
		return Response.json({
			success: true,
			filename,
			content,
			sizeBytes: stats.size,
			modifiedAt: stats.mtime.toISOString(),
		});
	} catch (err) {
		return Response.json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

async function handleWorkspaceWrite(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			sessionId?: string;
			filename?: string;
			content?: string;
		};
		const { sessionId, filename, content } = body;
		if (!sessionId || !filename || typeof content !== "string") {
			return Response.json(
				{
					success: false,
					error: "Missing 'sessionId', 'filename', or 'content'",
				},
				{ status: 400 },
			);
		}

		const { workspaceDir } = resolveWorkspace(sessionId);
		const targetPath = resolveSafePath(workspaceDir, filename);

		writeFileSync(targetPath, content, "utf-8");
		const stats = statSync(targetPath);

		return Response.json({
			success: true,
			filename,
			sizeBytes: stats.size,
			modifiedAt: stats.mtime.toISOString(),
		});
	} catch (err) {
		return Response.json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

async function handleWorkspaceList(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { sessionId?: string };
		const { sessionId } = body;
		if (!sessionId) {
			return Response.json(
				{ success: false, error: "Missing 'sessionId'" },
				{ status: 400 },
			);
		}

		const { workspaceDir } = resolveWorkspace(sessionId);
		const files: WorkspaceFileEntry[] = [];

		if (existsSync(workspaceDir)) {
			const entries = readdirSync(workspaceDir);
			for (const entry of entries) {
				if (entry.startsWith(".")) continue;
				const fullPath = join(workspaceDir, entry);
				try {
					const stats = statSync(fullPath);
					if (stats.isFile()) {
						const ext = extname(entry).toLowerCase();
						const artifactInfo = ARTIFACT_MIME_MAP[ext];
						files.push({
							filename: entry,
							sizeBytes: stats.size,
							modifiedAt: stats.mtime.toISOString(),
							isImage: artifactInfo?.type === "image",
							artifactType: artifactInfo?.type,
						});
					}
				} catch {}
			}
		}

		return Response.json({
			success: true,
			sessionId,
			files,
			totalFiles: files.length,
		});
	} catch (err) {
		return Response.json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

async function handleWorkspaceReset(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { sessionId?: string };
		const { sessionId } = body;
		if (!sessionId) {
			return Response.json(
				{ success: false, error: "Missing 'sessionId'" },
				{ status: 400 },
			);
		}

		const { workspaceDir } = resolveWorkspace(sessionId);
		if (existsSync(workspaceDir)) {
			rmSync(workspaceDir, { recursive: true, force: true });
			mkdirSync(workspaceDir, { recursive: true });
		}

		return Response.json({
			success: true,
			sessionId,
			message: "Workspace reset successfully.",
		});
	} catch (err) {
		return Response.json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}

console.log(`[Ket Sandbox] Starting code execution daemon on port ${PORT}...`);

Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);

		if (req.method === "GET" && url.pathname === "/health") {
			return Response.json({
				status: "ok",
				uptime: process.uptime(),
				runtime: "bun",
				timestamp: new Date().toISOString(),
			});
		}

		if (req.method === "POST" && url.pathname === "/execute") {
			return handleExecute(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/read") {
			return handleWorkspaceRead(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/write") {
			return handleWorkspaceWrite(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/list") {
			return handleWorkspaceList(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/reset") {
			return handleWorkspaceReset(req);
		}

		return Response.json({ error: "Not found" }, { status: 404 });
	},
});

console.log(`[Ket Sandbox] Daemon listening on http://0.0.0.0:${PORT}`);
