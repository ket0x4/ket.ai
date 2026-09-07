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
	executionId?: string;
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
	executionId?: string;
	status?: "completed" | "failed" | "cancelled";
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
