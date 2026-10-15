import {
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	realpathSync,
	statSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
	MAX_OUTPUT_BYTES,
	SANDBOX_BASE_DIR,
	SAFE_SESSION_ID_REGEX,
} from "./config";

// Ensure base sandbox directory exists
if (!existsSync(SANDBOX_BASE_DIR)) {
	try {
		mkdirSync(SANDBOX_BASE_DIR, { recursive: true });
	} catch (e) {
		console.error("Failed to create base sandbox directory:", e);
	}
}

export function resolveWorkspace(sessionId?: string): {
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

export function resolveSafePath(workspaceDir: string, relativePath: string): string {
	const clean = relativePath.trim();
	if (
		!clean ||
		clean.includes("\0") ||
		isAbsolute(clean) ||
		clean.split(/[\\/]/).some((segment) => segment === "..")
	) {
		throw new Error(
			"Access denied: Absolute paths and path traversal are forbidden.",
		);
	}
	const normalizedWorkspace = resolve(workspaceDir);
	const targetPath = resolve(normalizedWorkspace, clean);
	const rel = relative(normalizedWorkspace, targetPath);

	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(
			"Access denied: Path traversal outside workspace is forbidden.",
		);
	}
	// Existing symlinks must resolve inside the workspace. For new files,
	// validate the nearest existing parent instead.
	let existingPath = existsSync(targetPath) ? targetPath : dirname(targetPath);
	while (!existsSync(existingPath) && existingPath !== normalizedWorkspace) {
		existingPath = dirname(existingPath);
	}
	const realWorkspace = realpathSync(normalizedWorkspace);
	const realExistingPath = realpathSync(existingPath);
	const realRelative = relative(realWorkspace, realExistingPath);
	if (realRelative.startsWith("..") || isAbsolute(realRelative)) {
		throw new Error("Access denied: Symlink escapes workspace.");
	}

	if (existsSync(targetPath) && lstatSync(targetPath).isSymbolicLink()) {
		throw new Error("Access denied: Symbolic links are not writable.");
	}

	return targetPath;
}

export function getDirectorySizeBytes(dirPath: string): number {
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
export function getWorkspaceSnapshot(
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

export function truncateOutput(output: string): { text: string; truncated: boolean } {
	if (Buffer.byteLength(output, "utf-8") > MAX_OUTPUT_BYTES) {
		const truncated = output.slice(0, MAX_OUTPUT_BYTES);
		return {
			text: `${truncated}\n\n[... output truncated due to 256KB limit ...]`,
			truncated: true,
		};
	}
	return { text: output, truncated: false };
}

/**
 * Returns a sanitized, minimal environment to isolate untrusted scripts
 * and prevent leaking host secrets (API keys, bot tokens, DB configs).
 */
export function getSafeEnv(): Record<string, string> {
	return {
		PATH: `${process.env.HOME ? `${process.env.HOME}/.bun/bin:` : ""}/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
		LANG: process.env.LANG || "C.UTF-8",
		LC_ALL: process.env.LC_ALL || "C.UTF-8",
		TZ: process.env.TZ || "Europe/Istanbul",
		HOME: process.env.HOME || "/home/sandboxuser",
		USER: process.env.USER || "sandboxuser",
		TMPDIR: "/tmp",
		PYTHONUNBUFFERED: "1",
		MPLBACKEND: "Agg",
		QT_QPA_PLATFORM: "offscreen",
		PLAYWRIGHT_BROWSERS_PATH:
			process.env.PLAYWRIGHT_BROWSERS_PATH || "/ms-playwright",
		PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:
			process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
			"/usr/bin/chromium-browser",
		CHROME_BIN: process.env.CHROME_BIN || "/usr/bin/chromium-browser",
	};
}
