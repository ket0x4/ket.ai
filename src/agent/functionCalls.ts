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

function parseToolCallArgs(rawArgs?: string): Record<string, unknown> {
	if (!rawArgs) return {};
	try {
		const parsed = JSON.parse(rawArgs);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: { value: parsed };
	} catch {
		return { raw: rawArgs };
	}
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
						type?: string;
						function?: { name?: string; arguments?: string };
					}>;
				};
		  }
		| undefined;

	const rawToolCalls = firstChoice?.message?.tool_calls;
	if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
		const calls: RawFunctionCall[] = [];
		for (let i = 0; i < rawToolCalls.length; i++) {
			const tc = rawToolCalls[i];
			const name = tc?.function?.name;
			if (!name) continue;
			calls.push({
				id: tc.id?.trim() || `call_${i}_${name}_${Date.now()}`,
				name,
				args: parseToolCallArgs(tc.function?.arguments),
			});
		}
		return calls;
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
