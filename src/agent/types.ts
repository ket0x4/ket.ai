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

// biome-ignore lint/suspicious/noExplicitAny: Agent tools accept heterogeneous arguments and return types
export interface AgentTool<TArgs = any, TResult = any> {
	name: string;
	description: string;
	parameters: {
		type: "OBJECT";
		properties: Record<string, ToolParameterSchema>;
		required?: string[];
	};
	execute: (args: TArgs) => Promise<TResult>;
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
