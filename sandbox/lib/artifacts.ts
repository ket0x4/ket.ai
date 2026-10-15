import { readdirSync, readFileSync, statSync, type Stats } from "node:fs";
import { extname, join } from "node:path";
import { MAX_ARTIFACTS_COUNT, MAX_ARTIFACT_SIZE_BYTES } from "./config";
import type { ArtifactType, GeneratedArtifact } from "./types";

export const ARTIFACT_MIME_MAP: Record<string, { mimeType: string; type: ArtifactType }> = {
	// Images
	".png": { mimeType: "image/png", type: "image" },
	".jpg": { mimeType: "image/jpeg", type: "image" },
	".jpeg": { mimeType: "image/jpeg", type: "image" },
	".webp": { mimeType: "image/webp", type: "image" },
	".svg": { mimeType: "image/svg+xml", type: "image" },
	".gif": { mimeType: "image/gif", type: "image" },

	// Documents, Code & Spreadsheets
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
	".py": { mimeType: "text/x-python", type: "document" },
	".js": { mimeType: "application/javascript", type: "document" },
	".ts": { mimeType: "application/typescript", type: "document" },
	".sh": { mimeType: "text/x-shellscript", type: "document" },
	".bash": { mimeType: "text/x-shellscript", type: "document" },
	".html": { mimeType: "text/html", type: "document" },
	".css": { mimeType: "text/css", type: "document" },
	".md": { mimeType: "text/markdown", type: "document" },
	".sql": { mimeType: "application/sql", type: "document" },
	".yaml": { mimeType: "text/yaml", type: "document" },
	".yml": { mimeType: "text/yaml", type: "document" },
	".xml": { mimeType: "application/xml", type: "document" },
	".log": { mimeType: "text/plain", type: "document" },

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

export function isIntermediateArtifact(filename: string): boolean {
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
 * Oversized files that were skipped are appended to `notesOut` (when provided) so the agent can be
 * told to compress or split them instead of silently losing the deliverable.
 */
export function detectGeneratedArtifacts(
	workspaceDir: string,
	ignoredFileNames: string[] = [],
	beforeSnapshot?: Map<string, { size: number; mtimeMs: number }>,
	targetFiles?: string[],
	notesOut?: string[],
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
			stats: Stats;
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
				if (!entry || stats.size <= 0) continue;

				if (stats.size > MAX_ARTIFACT_SIZE_BYTES) {
					notesOut?.push(
						`Skipped '${file}' (${(stats.size / (1024 * 1024)).toFixed(1)}MB): it exceeds the ${MAX_ARTIFACT_SIZE_BYTES / (1024 * 1024)}MB artifact limit, so it was NOT delivered. Compress or split it (e.g. lower video resolution/bitrate) and send it with send_workspace_file.`,
					);
					continue;
				}

				candidateFiles.push({ file, stats, ext, entry, isExplicit });
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
