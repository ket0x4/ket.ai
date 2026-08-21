import { expect, test } from "bun:test";
import { Repository } from "../src/db/repository";
import { getSystemInstruction } from "../src/services/gemini/utils";

test("Default system persona ket-default is seeded", () => {
	const defaultKet = Repository.getPersonaById("ket-default");
	expect(defaultKet).not.toBeNull();
	expect(defaultKet?.name).toBe("ket.ai Standart");
	expect(defaultKet?.is_system).toBe(1);
	expect(defaultKet?.emoji).toBe("🤖");
});

test("Custom persona lifecycle (create, update, delete)", () => {
	const customId = `test_persona_${Date.now()}`;

	// 1. Create
	const created = Repository.createPersona({
		id: customId,
		name: "Test Robot",
		description: "A test robot persona",
		prompt: "You are a test robot. Speak in binary.",
		emoji: "🤖",
		createdBy: 99999,
	});

	expect(created.id).toBe(customId);
	expect(created.name).toBe("Test Robot");
	expect(created.is_system).toBe(0);
	expect(created.created_by).toBe(99999);

	// 2. Retrieve
	const fetched = Repository.getPersonaById(customId);
	expect(fetched?.prompt).toBe("You are a test robot. Speak in binary.");

	// 3. Update
	const updated = Repository.updatePersona(customId, {
		name: "Updated Robot",
		description: "Updated description",
		prompt: "Updated prompt content",
		emoji: "⚡",
	});

	expect(updated?.name).toBe("Updated Robot");
	expect(updated?.emoji).toBe("⚡");
	expect(updated?.prompt).toBe("Updated prompt content");

	// 4. Delete
	const deleteResult = Repository.deletePersona(customId);
	expect(deleteResult).toBe(true);

	const afterDelete = Repository.getPersonaById(customId);
	expect(afterDelete).toBeNull();
});

test("System personas cannot be deleted", () => {
	const result = Repository.deletePersona("ket-default");
	expect(result).toBe(false);

	const stillExists = Repository.getPersonaById("ket-default");
	expect(stillExists).not.toBeNull();
});

test("Chat active persona assignment and clearing on persona deletion", () => {
	const testChatId = `test_chat_persona_${Date.now()}`;
	const customId = `test_persona_chat_${Date.now()}`;

	Repository.createPersona({
		id: customId,
		name: "Temporary Persona",
		prompt: "Temporary prompt",
		emoji: "🎭",
	});

	// Initially no persona
	const initial = Repository.getActivePersonaForChat(testChatId);
	expect(initial).toBeNull();

	// Set active persona
	const setSuccess = Repository.setActivePersonaForChat(testChatId, customId);
	expect(setSuccess).toBe(true);

	const active = Repository.getActivePersonaForChat(testChatId);
	expect(active).not.toBeNull();
	expect(active?.id).toBe(customId);
	expect(active?.name).toBe("Temporary Persona");

	// Deleting the persona should clear active_persona_id from the chat
	Repository.deletePersona(customId);
	const activeAfterDelete = Repository.getActivePersonaForChat(testChatId);
	expect(activeAfterDelete).toBeNull();
});

test("getSystemInstruction combines base prompt and persona prompt", () => {
	const baseInstruction = getSystemInstruction();
	expect(baseInstruction.length).toBeGreaterThan(0);

	const personaPrompt = "Sen neşeli bir korsansın! Ahoy!";
	const combined = getSystemInstruction(personaPrompt);

	expect(combined).toContain(baseInstruction);
	expect(combined).toContain("### ACTIVE PERSONA INSTRUCTION ###");
	expect(combined).toContain(personaPrompt);
});
