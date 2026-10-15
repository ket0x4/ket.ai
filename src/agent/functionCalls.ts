/**
 * Normalized shape of a function call requested by the model.
 */
export interface RawFunctionCall {
	id?: string;
	name: string;
	args?: Record<string, unknown>;
}

interface GeminiFunctionCallPart {
	functionCall?: {
		id?: string;
		name?: string;
		args?: Record<string, unknown>;
	};
}

interface GeminiResponseLike {
	functionCalls?: Array<{
		id?: string;
		name?: string;
		args?: Record<string, unknown>;
	}>;
	candidates?: Array<{
		content?: {
			parts?: GeminiFunctionCallPart[];
		};
	}>;
}

/**
 * Extracts function calls from a Gemini model response, supporting both the
 * root `functionCalls` helper property and raw candidate content parts.
 */
export function extractFunctionCalls(
	response: GeminiResponseLike,
): RawFunctionCall[] {
	const rawParts = response.candidates?.[0]?.content?.parts;
	const candidateCalls =
		response.functionCalls ||
		rawParts?.filter((p) => p.functionCall?.name).map((p) => p.functionCall);
	return (candidateCalls || []).filter((fc): fc is RawFunctionCall =>
		Boolean(fc?.name),
	);
}
