export const DEFAULT_PERSONA_ID = "ket-default";

export interface DefaultPersonaSeed {
	id: string;
	name: string;
	description: string;
	prompt: string;
}

export const DEFAULT_PERSONA_SEED: DefaultPersonaSeed = {
	id: DEFAULT_PERSONA_ID,
	name: "ket.ai Standard",
	description: "Default smart, witty, and balanced ket.ai conversation style.",
	prompt:
		"Be a friendly, smart, witty, and natural conversation partner. Use fluent, modern, and natural language, avoiding robotic or artificial phrases. Never use emojis in your responses.",
};

/**
 * Maps an explicitly selected default persona onto `null`, which is the stored
 * representation for "let the base system prompt handle this chat".
 */
export function normalizePersonaId(
	personaId: string | null | undefined,
): string | null {
	return personaId && personaId !== DEFAULT_PERSONA_ID ? personaId : null;
}
