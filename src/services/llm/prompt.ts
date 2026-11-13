import { existsSync, readFileSync } from "node:fs";
import logger from "../../utils/logger";

const SYSTEM_PROMPT_FILE = "system.txt";

const TEST_SYSTEM_PROMPT = "You are ket.ai, a helpful AI assistant.";

function loadSystemPrompt(): string {
	if (!existsSync(SYSTEM_PROMPT_FILE)) {
		if (process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test") {
			return TEST_SYSTEM_PROMPT;
		}
		// Throwing (instead of process.exit) still aborts startup, but through a
		// normal error path with a stack trace instead of a silent hard exit.
		throw new Error(
			`FATAL: ${SYSTEM_PROMPT_FILE} not found! Bot cannot function without a system prompt.`,
		);
	}
	try {
		return readFileSync(SYSTEM_PROMPT_FILE, "utf-8").trim();
	} catch (e) {
		logger.error("FATAL: Error reading system.txt:", e);
		throw new Error(`FATAL: Failed to read ${SYSTEM_PROMPT_FILE}.`, {
			cause: e,
		});
	}
}

// Loaded once at module initialization (startup fails fast if it is missing).
const systemPrompt = loadSystemPrompt();

function buildToolAvailabilityRule(enabledTools: Iterable<string>): string {
	const list = [...new Set(enabledTools)];
	const available = list.length
		? list.map((t) => `\`${t}\``).join(", ")
		: "none";
	return `\n\n### ACTIVE TOOLS (authoritative) ###\nToday's date: ${new Date().toISOString().slice(0, 10)} (UTC). Enabled tools: ${available}. Never claim to use a tool not in this list.`;
}

export function getSystemInstruction(
	personaPrompt?: string,
	enabledTools?: Iterable<string>,
	contextSections?: string[],
): string {
	const sections = [
		systemPrompt,
		enabledTools
			? buildToolAvailabilityRule(enabledTools)
			: `\n\nToday's date: ${new Date().toISOString().slice(0, 10)} (UTC).`,
	];
	if (contextSections && contextSections.length > 0) {
		for (const section of contextSections) {
			if (section.trim()) {
				sections.push(`\n\n${section.trim()}`);
			}
		}
	}
	const base = sections.join("");

	if (!personaPrompt?.trim()) {
		return base;
	}
	return `${base}\n\n### ACTIVE PERSONA ###\n${personaPrompt.trim()}`;
}
