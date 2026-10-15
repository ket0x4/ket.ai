export interface ExecuteRequest {
	language: "python" | "javascript" | "typescript" | "bash";
	code: string;
	packages?: string[];
	timeoutMs?: number;
	sessionId?: string;
	filename?: string;
	targetFiles?: string[];
	stream?: boolean;
	executionId?: string;
}

export type ArtifactType = "image" | "document" | "video" | "audio";

export interface GeneratedArtifact {
	filename: string;
	mimeType: string;
	data: string; // base64
	sizeBytes: number;
	type: ArtifactType;
}

export interface ExecuteResponse {
	executionId: string;
	status: "completed" | "failed" | "cancelled";
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
	notes?: string[];
}

export interface WorkspaceFileEntry {
	filename: string;
	sizeBytes: number;
	modifiedAt: string;
	isImage: boolean;
	artifactType?: ArtifactType;
}

export interface ExecutionRecord {
	executionId: string;
	sessionId?: string;
	status:
		| "queued"
		| "installing"
		| "running"
		| "collecting"
		| "completed"
		| "failed"
		| "cancelled";
	cancel?: () => void;
	cancelRequested?: boolean;
}
