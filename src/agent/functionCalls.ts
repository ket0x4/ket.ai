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

interface ModelResponseLike {
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
	choices?: Array<{
		message?: {
			tool_calls?: Array<{
				id?: string;
				type?: string;
				function?: {
					name?: string;
					arguments?: string;
				};
			}>;
		};
	}>;
}

export function extractFunctionCalls(
	response: ModelResponseLike,
): RawFunctionCall[] {
	if (response.choices?.[0]?.message?.tool_calls) {
		return response.choices[0].message.tool_calls
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

	const rawParts = response.candidates?.[0]?.content?.parts;
	const candidateCalls =
		response.functionCalls ||
		rawParts?.filter((p) => p.functionCall?.name).map((p) => p.functionCall);
	return (candidateCalls || []).filter((fc): fc is RawFunctionCall =>
		Boolean(fc?.name),
	);
}
