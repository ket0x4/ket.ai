import { existsSync } from "node:fs";

// Package name validation regex to prevent command injection
const SAFE_PKG_REGEX = /^[a-zA-Z0-9_.-]+(?:[=<>!~]+[a-zA-Z0-9_.-]+)?$/;

export function sanitizePackages(packages?: string[]): string[] {
	if (!Array.isArray(packages)) return [];
	return packages
		.map((p) => (typeof p === "string" ? p.trim() : ""))
		.filter((p) => p.length > 0 && SAFE_PKG_REGEX.test(p));
}

export function resolveScriptCommand(
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

export function resolvePythonInstallCommand(packages: string[]): string[] {
	const hasUv =
		existsSync("/usr/local/bin/uv") ||
		existsSync("/usr/bin/uv") ||
		existsSync("/home/sandboxuser/.cargo/bin/uv") ||
		Boolean(process.env.UV_BIN);
	if (hasUv) {
		const uvPath = process.env.UV_BIN || "uv";
		return [uvPath, "pip", "install", "--system", ...packages];
	}
	return [
		"pip",
		"install",
		"--cache-dir",
		"/home/sandboxuser/.cache/pip",
		...packages,
	];
}
