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

export interface ModelResponseLike {
	toolCalls?: RawFunctionCall[];
	functionCalls?: Array<{
		id?: string;
		name?: string;
		args?: Record<string, unknown>;
	}>;
	candidates?: unknown[];
	choices?: unknown[];
}

export function extractFunctionCalls(
	response: ModelResponseLike,
): RawFunctionCall[] {
	if (Array.isArray(response.toolCalls) && response.toolCalls.length > 0) {
		return response.toolCalls.filter((fc) => Boolean(fc?.name));
	}

	const firstChoice = response.choices?.[0] as
		| {
				message?: {
					tool_calls?: Array<{
						id?: string;
						function?: { name?: string; arguments?: string };
					}>;
				};
		  }
		| undefined;

	if (firstChoice?.message?.tool_calls) {
		return firstChoice.message.tool_calls
			.filter((tc) => tc.function?.name)
			.map((tc) => {
				let parsedArgs: Record<string, unknown> = {};
				try {
					parsedArgs = tc.function?.arguments
						? JSON.parse(tc.function.arguments)
						: {};
				} catch {
					parsedArgs = { raw: tc.function?.arguments };
				}
				return {
					id: tc.id,
					name: tc.function?.name || "",
					args: parsedArgs,
				};
			});
	}

	const firstCandidate = response.candidates?.[0] as
		| { content?: { parts?: GeminiFunctionCallPart[] } }
		| undefined;
	const rawParts = firstCandidate?.content?.parts;
	const candidateCalls =
		response.functionCalls ||
		rawParts?.filter((p) => p.functionCall?.name).map((p) => p.functionCall);
	return (candidateCalls || []).filter((fc): fc is RawFunctionCall =>
		Boolean(fc?.name),
	);
}
