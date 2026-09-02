import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface ExecuteRequest {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	timeoutMs?: number;
}

interface ExecuteResponse {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
	executionTimeMs: number;
	error?: string;
	installedPackages?: string[];
	truncated?: boolean;
}

const PORT = Number(process.env.SANDBOX_PORT || 8080);
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB
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

async function runCommand(
	cmd: string[],
	cwd: string,
	timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(cmd, {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			PYTHONUNBUFFERED: "1",
			PLAYWRIGHT_BROWSERS_PATH:
				process.env.PLAYWRIGHT_BROWSERS_PATH || "/ms-playwright",
			PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:
				process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
				"/usr/bin/chromium-browser",
			CHROME_BIN: process.env.CHROME_BIN || "/usr/bin/chromium-browser",
		},
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

		const stdoutTruncated = truncateOutput(result.stdout);
		const stderrTruncated = truncateOutput(totalStderr);

		const responsePayload: ExecuteResponse = {
			success: result.exitCode === 0,
			stdout: stdoutTruncated.text,
			stderr: stderrTruncated.text,
			exitCode: result.exitCode,
			executionTimeMs: durationMs,
			installedPackages,
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
