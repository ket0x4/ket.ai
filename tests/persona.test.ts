import { expect, test } from "bun:test";
import { Repository } from "../src/db/repository";
import { getSystemInstruction } from "../src/services/gemini/utils";

test("Default system persona ket-default is seeded", () => {
	const defaultKet = Repository.getPersonaById("ket-default");
	expect(defaultKet).not.toBeNull();
	expect(defaultKet?.name).toBe("ket.ai Standard");
	expect(defaultKet?.is_system).toBe(1);
	expect(defaultKet?.emoji).toBe("");
});

test("Custom persona lifecycle (create, update, delete)", () => {
	const customId = `test_persona_${Date.now()}`;

	// 1. Create
	const created = Repository.createPersona({
		id: customId,
		name: "Test Robot",
		description: "A test robot persona",
		prompt: "You are a test robot. Speak in binary.",
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
	});

	expect(updated?.name).toBe("Updated Robot");
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

test("Setting persona, createChat, or adding memory preserves chat allowed status", () => {
	const testChatId = `test_chat_allowed_${Date.now()}`;
	Repository.upsertChat(testChatId, "Allowed Group", true);

	const chatBefore = Repository.getChat(testChatId);
	expect(chatBefore?.is_allowed).toBe(1);

	// 1. Setting active persona must not revoke group permission
	const customPersonaId = `test_p_${Date.now()}`;
	Repository.createPersona({
		id: customPersonaId,
		name: "Special Persona",
		prompt: "Special prompt",
	});
	const setResult = Repository.setActivePersonaForChat(
		testChatId,
		customPersonaId,
	);
	expect(setResult).toBe(true);

	const chatAfterPersona = Repository.getChat(testChatId);
	expect(chatAfterPersona?.is_allowed).toBe(1);
	expect(chatAfterPersona?.active_persona_id).toBe(customPersonaId);

	// 2. Calling createChat on existing chat must not revoke group permission
	Repository.createChat(testChatId, "");
	const chatAfterCreate = Repository.getChat(testChatId);
	expect(chatAfterCreate?.is_allowed).toBe(1);

	// 3. Adding memory to chat must not revoke group permission
	Repository.addMemory(testChatId, "Alice likes coffee", [0.1, 0.2, 0.3]);
	const chatAfterMemory = Repository.getChat(testChatId);
	expect(chatAfterMemory?.is_allowed).toBe(1);
});

test("getSystemInstruction combines base prompt and persona prompt", () => {
	const baseInstruction = getSystemInstruction();
	expect(baseInstruction.length).toBeGreaterThan(0);

	const personaPrompt = "You are a cheerful pirate! Ahoy!";
	const combined = getSystemInstruction(personaPrompt);

	expect(combined).toContain(baseInstruction);
	expect(combined).toContain("### ACTIVE PERSONA INSTRUCTION ###");
	expect(combined).toContain(personaPrompt);
});
