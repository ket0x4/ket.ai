type JSONSchemaType =
	| "STRING"
	| "NUMBER"
	| "INTEGER"
	| "BOOLEAN"
	| "ARRAY"
	| "OBJECT";

interface ToolParameterSchema {
	type: JSONSchemaType;
	description?: string;
	properties?: Record<string, ToolParameterSchema>;
	required?: string[];
	items?: ToolParameterSchema;
}

export type ArtifactMediaType = "image" | "document" | "video" | "audio";

export interface GeneratedMediaArtifact {
	filename: string;
	mimeType: string;
	buffer: Buffer;
	type: ArtifactMediaType;
	sizeBytes: number;
	caption?: string;
}

export interface ToolProgressUpdate {
	statusText?: string;
	stdoutSnippet?: string;
	fullStdout?: string;
	type?: "status" | "stdout" | "stderr";
}

export interface ToolExecutionContext {
	chatId?: string;
	sessionId?: string;
	step?: number;
	traceId?: string;
	signal?: AbortSignal;
	sentFiles?: Set<string>;
	onProgress?: (progress: ToolProgressUpdate) => void;
	emitArtifact?: (artifact: GeneratedMediaArtifact) => void;
}

// biome-ignore lint/suspicious/noExplicitAny: Agent tools accept heterogeneous arguments and return types
export interface AgentTool<TArgs = any, TResult = any> {
	name: string;
	description: string;
	parameters: {
		type: "OBJECT";
		properties: Record<string, ToolParameterSchema>;
		required?: string[];
	};
	/**
	 * Optional runtime gate. When it returns false the tool is hidden from the
	 * model and rejected by the registry, allowing tools to be enabled/disabled
	 * from config without the registry hardcoding tool names.
	 */
	isEnabled?: () => boolean;
	execute: (args: TArgs, context?: ToolExecutionContext) => Promise<TResult>;
}

export interface FunctionDeclaration {
	name: string;
	description: string;
	parameters: {
		type: "OBJECT";
		properties: Record<string, ToolParameterSchema>;
		required?: string[];
	};
}
