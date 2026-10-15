import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
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
