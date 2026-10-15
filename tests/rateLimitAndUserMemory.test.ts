import { expect, test } from "bun:test";
import { Repository } from "../src/db/repository";
import { checkRateLimit, resetRateLimits } from "../src/services/bot/rateLimit";

test("checkRateLimit enforces a sliding window and reset clears state", () => {
	resetRateLimits();
	const key = "test:limit";

	expect(checkRateLimit(key, 3)).toBe(true);
	expect(checkRateLimit(key, 3)).toBe(true);
	expect(checkRateLimit(key, 3)).toBe(true);
	// 4th event within the window is rejected and not recorded.
	expect(checkRateLimit(key, 3)).toBe(false);

	resetRateLimits();
	expect(checkRateLimit(key, 3)).toBe(true);

	// A non-positive limit disables limiting entirely.
	expect(checkRateLimit("test:disabled", 0)).toBe(true);

	resetRateLimits();
});

test("cross-chat user memories retain embeddings for dense ranking", () => {
	const chatA = "test_usermem_chat_a";
	const chatB = "test_usermem_chat_b";
	const userId = 424242;
	Repository.clearMemories(chatA);
	Repository.clearMemories(chatB);

	Repository.addMemory(chatA, "Cross: loves hiking", [1, 0, 0], { userId });
	Repository.addMemory(chatB, "Cross: plays guitar", [0, 1, 0], { userId });

	const all = Repository.getUserAllMemories(userId).filter((m) =>
		m.text.startsWith("Cross:"),
	);
	expect(all.length).toBe(2);
	for (const m of all) {
		// Regression guard: embeddings used to be dropped for cross-chat memories.
		expect(m.embedding.length).toBe(3);
	}

	Repository.clearMemories(chatA);
	Repository.clearMemories(chatB);
});

test("private chat retrieves cross-chat personal memories via dense scoring", async () => {
	const { queryMemoriesWithDiagnostics } = await import(
		"../src/services/gemini/memory"
	);
	const { ai } = await import("../src/services/gemini/client");

	const groupChat = "test_xchat_group";
	const privateChat = "test_xchat_private";
	const userId = 777001;
	Repository.clearMemories(groupChat);
	Repository.clearMemories(privateChat);

	// Personal fact stored only in the group chat.
	Repository.addMemory(groupChat, "Cross: allergic to peanuts", [1, 0], {
		userId,
		category: "PROFILE",
	});

	const originalEmbed = ai.models.embedContent;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(ai.models as any).embedContent = async () => ({
		embeddings: [{ values: [1, 0] }],
	});

	try {
		const diag = await queryMemoriesWithDiagnostics(
			privateChat,
			"What am I allergic to?",
			{
				isPrivateChat: true,
				senderUserId: userId,
				threshold: 0.6,
			},
		);
		// Before the fix these memories were merged with empty embeddings and
		// could never pass the dense threshold.
		expect(diag.retrievedMemories).toContain("Cross: allergic to peanuts");
	} finally {
		ai.models.embedContent = originalEmbed;
		Repository.clearMemories(groupChat);
		Repository.clearMemories(privateChat);
	}
});
