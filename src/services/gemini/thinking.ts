import { CONFIG } from "../../config";

function isGemma4Model(lower: string): boolean {
	return lower.includes("gemma-4");
}

function getGemma4ThinkingConfig(isAgentic: boolean): Record<string, unknown> {
	return { thinkingLevel: isAgentic ? "MEDIUM" : "MINIMAL" };
}

function getAgenticThinkingConfig(lower: string): Record<string, unknown> {
	if (lower.includes("3") || lower.includes("gemini-3")) {
		return { thinkingLevel: "LOW" };
	}
	if (lower.includes("2.5") && lower.includes("pro")) {
		return { thinkingBudget: 1024 };
	}
	return { thinkingBudget: 512 };
}

function getDefaultThinkingConfig(lower: string): Record<string, unknown> {
	if (lower.includes("2.5") && lower.includes("pro")) {
		return { thinkingBudget: 128 };
	}
	if (lower.includes("3") || lower.includes("gemini-3")) {
		return { thinkingLevel: "MINIMAL" };
	}
	return { thinkingBudget: 0 };
}

/**
 * Returns thinkingConfig. Uses minimal thinking on single-shot chat turns and
 * a bounded reasoning budget on multi-step tool turns.
 */
export function getThinkingConfig(
	modelName: string = CONFIG.GEMINI_MODEL,
	options?: { isAgentic?: boolean },
): Record<string, unknown> | undefined {
	const lower = (modelName || "").toLowerCase();
	const isAgentic = Boolean(options?.isAgentic && CONFIG.ENABLE_AGENT_THINKING);

	if (isGemma4Model(lower)) {
		return getGemma4ThinkingConfig(isAgentic);
	}
	if (isAgentic) {
		return getAgenticThinkingConfig(lower);
	}
	return getDefaultThinkingConfig(lower);
}
