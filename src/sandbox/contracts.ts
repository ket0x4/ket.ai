type SandboxLanguage = "python" | "javascript" | "typescript" | "bash";

type SandboxArtifactType = "image" | "document" | "video" | "audio";

interface SandboxArtifact {
	filename: string;
	mimeType: string;
	data: string;
	sizeBytes: number;
	type: SandboxArtifactType;
}

export interface SandboxExecuteRequest {
	language: SandboxLanguage;
	code: string;
	packages?: string[];
	timeoutMs?: number;
	sessionId?: string;
	filename?: string;
	targetFiles?: string[];
	stream?: boolean;
}

export interface SandboxExecuteResponse {
	success: boolean;
	stdout: string;
	stderr?: string;
	exitCode: number;
	executionTimeMs: number;
	installedPackages?: string[];
	artifacts?: SandboxArtifact[];
	images?: SandboxArtifact[];
	errorHint?: string;
	truncated?: boolean;
	error?: string;
}

export interface SandboxStreamEvent {
	type: "status" | "stdout" | "stderr" | "result" | string;
	text: string;
	data?: unknown;
}

export interface WorkspaceReadRequest {
	sessionId: string;
	filename: string;
	encoding?: "utf-8" | "base64";
}

export interface WorkspaceWriteRequest {
	sessionId: string;
	filename: string;
	content: string;
	encoding?: "utf-8" | "base64";
}

export interface WorkspaceListRequest {
	sessionId: string;
}

export interface WorkspaceResetRequest {
	sessionId: string;
}
