import logger from "../../utils/logger";

/**
 * Lenient JSON parsing for structured model output: direct parse first, then
 * fence-stripped slice extraction, then trailing-comma repair. Shared by both
 * provider `generateStructured` implementations.
 */

function tryExtractArraySlice(cleaned: string): unknown | null {
	const first = cleaned.indexOf("[");
	const last = cleaned.lastIndexOf("]");
	if (first !== -1 && last > first) {
		try {
			return JSON.parse(cleaned.slice(first, last + 1));
		} catch {}
	}
	return null;
}

function tryExtractObjectSlice(cleaned: string): unknown | null {
	const first = cleaned.indexOf("{");
	const last = cleaned.lastIndexOf("}");
	if (first !== -1 && last > first) {
		try {
			return JSON.parse(cleaned.slice(first, last + 1));
		} catch {}
	}
	return null;
}

function extractFirstArrayValue(obj: unknown): unknown | null {
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
	for (const val of Object.values(obj as Record<string, unknown>)) {
		if (Array.isArray(val)) return val;
	}
	return null;
}

function tryRelaxedJsonParse(cleaned: string): unknown | null {
	try {
		const relaxed = cleaned.replace(/,\s*([}\]])/g, "$1");
		return JSON.parse(relaxed);
	} catch {
		return null;
	}
}

function tryExtractDirectJson(
	cleaned: string,
	isArrayExpected: boolean,
): unknown | null {
	try {
		const parsed = JSON.parse(cleaned);
		if (isArrayExpected) {
			const nested = extractFirstArrayValue(parsed);
			if (nested) return nested;
		}
		return parsed;
	} catch {
		return null;
	}
}

function tryExtractObjectOrArraySlice(
	cleaned: string,
	isArrayExpected: boolean,
): unknown | null {
	if (isArrayExpected) {
		const arrSlice = tryExtractArraySlice(cleaned);
		if (arrSlice) return arrSlice;
	}
	const objSlice = tryExtractObjectSlice(cleaned);
	if (objSlice) {
		if (isArrayExpected) {
			const nested = extractFirstArrayValue(objSlice);
			if (nested) return nested;
		}
		return objSlice;
	}
	return null;
}

function stripJsonFences(text: string): string {
	return text
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

const normalizedSchemaCache = new WeakMap<object, unknown>();

/**
 * Lowercases JSON Schema type keywords so OpenAI-compatible endpoints accept
 * schemas authored in Gemini's uppercase convention. Results are cached.
 */
export function normalizeSchemaSafely(schema: unknown): unknown {
	if (!schema || typeof schema !== "object") return schema;
	if (Array.isArray(schema)) return schema.map(normalizeSchemaSafely);

	const cached = normalizedSchemaCache.get(schema);
	if (cached) return cached;

	const obj = { ...(schema as Record<string, unknown>) };
	if (typeof obj.type === "string") {
		obj.type = obj.type.toLowerCase();
	}
	if (obj.properties && typeof obj.properties === "object") {
		const props: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(
			obj.properties as Record<string, unknown>,
		)) {
			props[key] = normalizeSchemaSafely(val);
		}
		obj.properties = props;
	}
	if (obj.items) {
		obj.items = normalizeSchemaSafely(obj.items);
	}
	normalizedSchemaCache.set(schema, obj);
	return obj;
}

export function parseStructuredJson<T>(
	rawText: string,
	isArrayExpected = false,
): T {
	if (!rawText) return (isArrayExpected ? [] : {}) as T;

	const cleaned = stripJsonFences(rawText);

	const direct = tryExtractDirectJson(cleaned, isArrayExpected);
	if (direct !== null) return direct as T;

	const sliced = tryExtractObjectOrArraySlice(cleaned, isArrayExpected);
	if (sliced !== null) return sliced as T;

	const relaxed = tryRelaxedJsonParse(cleaned);
	if (relaxed !== null) return relaxed as T;

	logger.warn(
		`[LLM] Failed to parse structured JSON from text: "${rawText.slice(0, 200)}"`,
	);
	return (isArrayExpected ? [] : {}) as T;
}
