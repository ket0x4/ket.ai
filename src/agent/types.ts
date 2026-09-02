export type JSONSchemaType =
	| "STRING"
	| "NUMBER"
	| "INTEGER"
	| "BOOLEAN"
	| "ARRAY"
	| "OBJECT";

export interface ToolParameterSchema {
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
