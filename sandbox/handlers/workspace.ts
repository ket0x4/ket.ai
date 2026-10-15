import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { extname, join, relative } from "node:path";
import { ARTIFACT_MIME_MAP } from "../lib/artifacts";
import type { WorkspaceFileEntry } from "../lib/types";
import { resolveSafePath, resolveWorkspace } from "../lib/workspace";

export async function handleWorkspaceRead(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			sessionId?: string;
			filename?: string;
			encoding?: "utf-8" | "base64";
		};
		const { sessionId, filename, encoding } = body;
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

		if (encoding === "base64") {
			const buffer = readFileSync(targetPath);
			return Response.json({
				success: true,
				filename,
				data: buffer.toString("base64"),
				sizeBytes: stats.size,
				modifiedAt: stats.mtime.toISOString(),
			});
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

export async function handleWorkspaceWrite(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			sessionId?: string;
			filename?: string;
			content?: string;
			encoding?: "utf-8" | "base64";
		};
		const { sessionId, filename, content, encoding } = body;
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

		const buffer =
			encoding === "base64"
				? Buffer.from(content, "base64")
				: Buffer.from(content, "utf-8");
		writeFileSync(targetPath, buffer);
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

export async function handleWorkspaceList(req: Request): Promise<Response> {
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

export async function handleWorkspaceReset(req: Request): Promise<Response> {
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

const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".bmp",
	".ico",
	".pdf",
	".zip",
	".gz",
	".tar",
	".xlsx",
	".xls",
	".docx",
	".doc",
	".pptx",
	".mp3",
	".mp4",
	".wav",
	".ogg",
	".webm",
	".mov",
	".avi",
	".woff",
	".woff2",
	".ttf",
	".otf",
	".so",
	".dylib",
	".dll",
	".exe",
	".bin",
	".wasm",
]);

function listWorkspaceFilesRecursive(
	dir: string,
	base = dir,
	acc: string[] = [],
): string[] {
	if (!existsSync(dir)) return acc;
	for (const entry of readdirSync(dir)) {
		if (entry.startsWith(".") || entry === "node_modules") continue;
		const fullPath = join(dir, entry);
		let stats: ReturnType<typeof statSync>;
		try {
			stats = statSync(fullPath);
		} catch {
			continue;
		}
		if (stats.isDirectory()) {
			listWorkspaceFilesRecursive(fullPath, base, acc);
		} else if (stats.isFile()) {
			acc.push(relative(base, fullPath));
		}
	}
	return acc;
}

function matchesFilePattern(filename: string, pattern?: string): boolean {
	if (!pattern?.trim()) return true;
	const regex = new RegExp(
		`^${pattern
			.trim()
			.replace(/[.+^${}()|[\]\\]/g, "\\$&")
			.replace(/\*/g, ".*")
			.replace(/\?/g, ".")}$`,
		"i",
	);
	return regex.test(filename);
}

export async function handleWorkspaceSearch(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as {
			sessionId?: string;
			query?: string;
			filePattern?: string;
			maxResults?: number;
			caseSensitive?: boolean;
		};
		const { sessionId, query, filePattern, caseSensitive } = body;
		if (!sessionId || !query?.trim()) {
			return Response.json(
				{ success: false, error: "Missing 'sessionId' or 'query'" },
				{ status: 400 },
			);
		}

		const maxResults =
			typeof body.maxResults === "number" && body.maxResults > 0
				? Math.min(body.maxResults, 200)
				: 50;

		const { workspaceDir } = resolveWorkspace(sessionId);
		const needle = caseSensitive ? query : query.toLowerCase();
		const matches: Array<{
			filename: string;
			line: number;
			text: string;
		}> = [];
		let totalMatches = 0;
		let filesSearched = 0;
		let truncated = false;

		for (const relativePath of listWorkspaceFilesRecursive(workspaceDir)) {
			if (!matchesFilePattern(relativePath, filePattern)) continue;
			if (BINARY_EXTENSIONS.has(extname(relativePath).toLowerCase())) continue;

			let content: string;
			try {
				const fullPath = resolveSafePath(workspaceDir, relativePath);
				const buffer = readFileSync(fullPath);
				if (buffer.includes(0)) continue; // crude binary guard
				content = buffer.toString("utf-8");
			} catch {
				continue;
			}
			filesSearched++;

			const lines = content.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const haystack = caseSensitive ? lines[i] : lines[i].toLowerCase();
				if (haystack.includes(needle)) {
					totalMatches++;
					if (matches.length < maxResults) {
						matches.push({
							filename: relativePath,
							line: i + 1,
							text: lines[i].slice(0, 300),
						});
					} else {
						truncated = true;
					}
				}
			}
		}

		return Response.json({
			success: true,
			sessionId,
			query,
			matches,
			totalMatches,
			filesSearched,
			truncated,
		});
	} catch (err) {
		return Response.json(
			{ success: false, error: err instanceof Error ? err.message : String(err) },
			{ status: 500 },
		);
	}
}
