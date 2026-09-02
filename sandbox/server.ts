import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

interface ExecuteRequest {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	timeoutMs?: number;
}

export interface GeneratedImage {
	filename: string;
	mimeType: string;
	data: string; // base64
	sizeBytes: number;
}

interface ExecuteResponse {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
	executionTimeMs: number;
	error?: string;
	errorHint?: string;
	installedPackages?: string[];
	images?: GeneratedImage[];
	truncated?: boolean;
}

const PORT = Number(process.env.SANDBOX_PORT || 8080);
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_IMAGES_COUNT = 5;
const SANDBOX_BASE_DIR = process.env.SANDBOX_BASE_DIR || "/tmp/sandboxes";

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

const IMAGE_MIME_MAP: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".gif": "image/gif",
};

/**
 * Scans the workspace directory for generated images/plots (e.g. from Matplotlib or Playwright screenshots).
 */
function detectGeneratedImages(
	workspaceDir: string,
	ignoredFileNames: string[] = [],
): GeneratedImage[] {
	const images: GeneratedImage[] = [];
	try {
		const entries = readdirSync(workspaceDir);
		for (const file of entries) {
			if (ignoredFileNames.includes(file)) continue;

			const filePath = join(workspaceDir, file);
			try {
				const stats = statSync(filePath);
				if (!stats.isFile()) continue;

				const ext = extname(file).toLowerCase();
				const mimeType = IMAGE_MIME_MAP[ext];
				if (mimeType && stats.size > 0 && stats.size <= MAX_IMAGE_SIZE_BYTES) {
					const fileBuffer = readFileSync(filePath);
					images.push({
						filename: file,
						mimeType,
						data: fileBuffer.toString("base64"),
						sizeBytes: stats.size,
					});

					if (images.length >= MAX_IMAGES_COUNT) break;
				}
			} catch (err) {
				console.warn(`[Sandbox] Failed to read potential artifact ${file}:`, err);
			}
		}
	} catch (err) {
		console.warn(`[Sandbox] Error scanning workspace for images:`, err);
	}
	return images;
}

/**
 * Parses stderr to provide intelligent self-healing hints for the LLM agent.
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

	// 4. Timeout
	if (exitCode === 124 || stderr.includes("timed out")) {
		return "Hint: Script execution timed out. If performing web scraping or heavy computation, consider reducing loops or queries.";
	}

	// 5. NameError
	const nameMatch = stderr.match(
		/NameError: name '([a-zA-Z0-9_]+)' is not defined/,
	);
	if (nameMatch) {
		return `Hint: Variable or function '${nameMatch[1]}' is not defined before use.`;
	}

	return undefined;
}

async function runCommand(
	cmd: string[],
	cwd: string,
	timeoutMs: number,
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
			const [stdoutBytes, stderrBytes] = await Promise.all([
				new Response(proc.stdout).arrayBuffer(),
				new Response(proc.stderr).arrayBuffer(),
			]);
			const exitCode = await proc.exited;
			if (timer) clearTimeout(timer);

			return {
				stdout: Buffer.from(stdoutBytes).toString("utf-8"),
				stderr: Buffer.from(stderrBytes).toString("utf-8"),
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

	const { language, code } = body;
	if (!code || typeof code !== "string") {
		return Response.json(
			{ success: false, error: "Missing or invalid 'code' string parameter" },
			{ status: 400 },
		);
	}

	const normalizedLang = (language || "python").toLowerCase();
	if (!["python", "javascript", "typescript", "bash", "sh"].includes(normalizedLang)) {
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
	const execId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
	const workspaceDir = join(SANDBOX_BASE_DIR, execId);

	const startTime = Date.now();
	let packageInstallStderr = "";
	const installedPackages: string[] = [];

	try {
		mkdirSync(workspaceDir, { recursive: true });

		// Step 1: Install packages if requested
		if (packages.length > 0) {
			console.log(`[Sandbox:${execId}] Installing packages: ${packages.join(", ")}`);
			let installCmd: string[] = [];

			if (normalizedLang === "python") {
				installCmd = ["pip", "install", "--no-cache-dir", ...packages];
			} else if (normalizedLang === "javascript" || normalizedLang === "typescript") {
				installCmd = ["bun", "add", ...packages];
			}

			if (installCmd.length > 0) {
				const pkgResult = await runCommand(installCmd, workspaceDir, 60_000);
				if (pkgResult.exitCode !== 0) {
					console.warn(
						`[Sandbox:${execId}] Package install warning / error:`,
						pkgResult.stderr,
					);
					packageInstallStderr = `Package installation warning:\n${pkgResult.stderr}\n`;
				} else {
					installedPackages.push(...packages);
				}
			}
		}

		// Step 2: Write script file
		let scriptFileName = "script.py";
		let execCommand: string[] = ["python3", "script.py"];

		if (normalizedLang === "javascript") {
			scriptFileName = "script.mjs";
			execCommand = ["bun", "run", "script.mjs"];
		} else if (normalizedLang === "typescript") {
			scriptFileName = "script.ts";
			execCommand = ["bun", "run", "script.ts"];
		} else if (normalizedLang === "bash" || normalizedLang === "sh") {
			scriptFileName = "script.sh";
			execCommand = ["bash", "script.sh"];
		}

		const scriptPath = join(workspaceDir, scriptFileName);
		writeFileSync(scriptPath, code, "utf-8");

		// Step 3: Execute script
		console.log(
			`[Sandbox:${execId}] Executing ${normalizedLang} script (timeout: ${timeout}ms)...`,
		);
		const result = await runCommand(execCommand, workspaceDir, timeout);
		const durationMs = Date.now() - startTime;

		const totalStderr = packageInstallStderr
			? `${packageInstallStderr}\n${result.stderr}`
			: result.stderr;

		// Detect any images generated by the script (e.g. Matplotlib plots, screenshots)
		const generatedImages = detectGeneratedImages(workspaceDir, [
			scriptFileName,
			"package.json",
			"bun.lock",
		]);

		const stdoutTruncated = truncateOutput(result.stdout);
		const stderrTruncated = truncateOutput(totalStderr);
		const errorHint = generateErrorHint(totalStderr, result.exitCode);

		const responsePayload: ExecuteResponse = {
			success: result.exitCode === 0,
			stdout: stdoutTruncated.text,
			stderr: stderrTruncated.text,
			exitCode: result.exitCode,
			executionTimeMs: durationMs,
			installedPackages,
			images: generatedImages.length > 0 ? generatedImages : undefined,
			errorHint,
			truncated: stdoutTruncated.truncated || stderrTruncated.truncated,
		};

		return Response.json(responsePayload);
	} catch (error) {
		const durationMs = Date.now() - startTime;
		const errMessage = error instanceof Error ? error.message : String(error);
		console.error(`[Sandbox:${execId}] Execution exception:`, error);
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
		// Clean up isolated workspace
		try {
			rmSync(workspaceDir, { recursive: true, force: true });
			console.log(`[Sandbox:${execId}] Cleaned up workspace directory.`);
		} catch (cleanupErr) {
			console.warn(
				`[Sandbox:${execId}] Failed to clean up workspace:`,
				cleanupErr,
			);
		}
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

		return Response.json({ error: "Not found" }, { status: 404 });
	},
});

console.log(`[Ket Sandbox] Daemon listening on http://0.0.0.0:${PORT}`);
