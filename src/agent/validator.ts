import type { ToolParameterSchema } from "./types";

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

function checkType(value: unknown, expectedType: string): boolean {
	switch (expectedType) {
		case "STRING":
			return typeof value === "string";
		case "NUMBER":
			return typeof value === "number" && !Number.isNaN(value);
		case "INTEGER":
			return typeof value === "number" && Number.isInteger(value);
		case "BOOLEAN":
			return typeof value === "boolean";
		case "ARRAY":
			return Array.isArray(value);
		case "OBJECT":
			return (
				typeof value === "object" && value !== null && !Array.isArray(value)
			);
		default:
			return true;
	}
}

function validateRequiredFields(
	args: Record<string, unknown>,
	required: string[],
	properties: Record<string, ToolParameterSchema>,
): ValidationResult | null {
	for (const reqKey of required) {
		const val = args[reqKey];
		if (val === undefined || val === null || val === "") {
			const expectedType = properties[reqKey]?.type || "value";
			return {
				valid: false,
				error: `Missing required parameter '${reqKey}'. Expected type: ${expectedType}.`,
			};
		}
	}
	return null;
}

function validateArrayItems(
	key: string,
	items: unknown[],
	itemSchema: ToolParameterSchema,
): ValidationResult | null {
	for (let i = 0; i < items.length; i++) {
		if (!checkType(items[i], itemSchema.type)) {
			return {
				valid: false,
				error: `Invalid item type in array '${key}' at index ${i}. Expected ${itemSchema.type}, got ${typeof items[i]}.`,
			};
		}
	}
	return null;
}

function validateProperty(
	key: string,
	val: unknown,
	propSchema: ToolParameterSchema,
): ValidationResult | null {
	if (!checkType(val, propSchema.type)) {
		return {
			valid: false,
			error: `Invalid type for parameter '${key}'. Expected ${propSchema.type}, got ${typeof val}.`,
		};
	}

	if (propSchema.type === "ARRAY" && Array.isArray(val) && propSchema.items) {
		return validateArrayItems(key, val, propSchema.items);
	}

	return null;
}

function validateProperties(
	args: Record<string, unknown>,
	properties: Record<string, ToolParameterSchema>,
): ValidationResult | null {
	for (const [key, propSchema] of Object.entries(properties)) {
		const val = args[key];
		if (val !== undefined && val !== null) {
			const propError = validateProperty(key, val, propSchema);
			if (propError) return propError;
		}
	}
	return null;
}

/**
 * Validates tool call arguments against the tool's parameter schema.
 * Returns actionable error messages if arguments are invalid.
 */
export function validateToolArguments(
	args: Record<string, unknown> | undefined,
	schema: {
		type: "OBJECT";
		properties: Record<string, ToolParameterSchema>;
		required?: string[];
	},
): ValidationResult {
	const actualArgs = args || {};

	if (schema.required) {
		const reqError = validateRequiredFields(
			actualArgs,
			schema.required,
			schema.properties || {},
		);
		if (reqError) return reqError;
	}

	if (schema.properties) {
		const propError = validateProperties(actualArgs, schema.properties);
		if (propError) return propError;
	}

	return { valid: true };
}
