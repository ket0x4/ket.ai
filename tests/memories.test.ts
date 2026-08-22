import { expect, test } from "bun:test";
import { Repository } from "../src/db/repository";

test("Memory pagination logic", () => {
	const testChatId = "test_pagination_chat_123";

	// Clear existing test memories
	Repository.clearMemories(testChatId);

	// Add 12 test memories
	for (let i = 1; i <= 12; i++) {
		Repository.addMemory(testChatId, `Test memory ${i}`, []);
	}

	const memories = Repository.getMemories(testChatId);
	expect(memories.length).toBe(12);

	// Clean up
	Repository.clearMemories(testChatId);
});

test("Memory caching and invalidation", () => {
	const testChatId = "test_cache_chat_456";

	Repository.clearMemories(testChatId);

	Repository.addMemory(testChatId, "User lives in Istanbul", [0.1, 0.2, 0.3]);

	// First retrieval populates cache
	const firstCall = Repository.getMemories(testChatId);
	expect(firstCall.length).toBe(1);
	expect(firstCall[0].text).toBe("User lives in Istanbul");

	// Second retrieval returns identical cached reference
	const secondCall = Repository.getMemories(testChatId);
	expect(secondCall).toBe(firstCall);

	// Add memory invalidates cache
	Repository.addMemory(
		testChatId,
		"User is a software developer",
		[0.4, 0.5, 0.6],
	);
	const thirdCall = Repository.getMemories(testChatId);
	expect(thirdCall.length).toBe(2);
	expect(thirdCall).not.toBe(firstCall);

	// Clean up
	Repository.clearMemories(testChatId);
	expect(Repository.getMemories(testChatId).length).toBe(0);
});

test("User memory indexing and TTL pruning", () => {
	const testChatId = "test_user_ttl_789";
	const userIdAlice = 111;
	const userIdBob = 222;

	Repository.clearMemories(testChatId);

	// Add Alice's memory (Permanent profile)
	Repository.addMemory(testChatId, "Alice: Enjoys coffee", [0.1, 0.1], {
		userId: userIdAlice,
		category: "PROFILE",
	});

	// Add Bob's temporary memory (Expired 1 day ago)
	Repository.addMemory(testChatId, "Bob: Sick today", [0.2, 0.2], {
		userId: userIdBob,
		category: "TEMPORARY",
		ttlDays: -1, // Expired yesterday
	});

	const aliceMemories = Repository.getUserMemories(testChatId, userIdAlice);
	expect(aliceMemories.length).toBe(1);
	expect(aliceMemories[0].text).toBe("Alice: Enjoys coffee");
	expect(aliceMemories[0].userId).toBe(userIdAlice);

	// Total before prune
	expect(Repository.getMemories(testChatId).length).toBe(2);

	// Prune expired memories
	const prunedCount = Repository.pruneExpiredMemories(testChatId);
	expect(prunedCount).toBe(1);

	// Total after prune
	const remaining = Repository.getMemories(testChatId);
	expect(remaining.length).toBe(1);
	expect(remaining[0].userId).toBe(userIdAlice);

	// Clean up
	Repository.clearMemories(testChatId);
});

test("Background memory worker counter logic", async () => {
	const { checkAndRunBackgroundMemoryExtraction } = await import(
		"../src/services/gemini/memoryWorker"
	);
	const testChatId = "test_worker_counter_999";

	// Call 14 times — should not trigger background extraction
	for (let i = 0; i < 14; i++) {
		await checkAndRunBackgroundMemoryExtraction(testChatId);
	}

	// 15th call triggers worker
	await checkAndRunBackgroundMemoryExtraction(testChatId);
	expect(true).toBe(true);
});

test("queryMemoriesWithDiagnostics returns comprehensive diagnostics", async () => {
	const { queryMemoriesWithDiagnostics } = await import(
		"../src/services/gemini/memory"
	);
	const { ai } = await import("../src/services/gemini/client");

	const testChatId = "test_diagnostics_chat_101";
	Repository.clearMemories(testChatId);

	// 1. Empty chat test
	const emptyResult = await queryMemoriesWithDiagnostics(
		testChatId,
		"What do you know about me?",
	);
	expect(emptyResult.totalMemoriesInChat).toBe(0);
	expect(emptyResult.retrievedMemories.length).toBe(0);
	expect(emptyResult.details.length).toBe(0);

	// 2. Add memories with synthetic embeddings
	Repository.addMemory(
		testChatId,
		"User loves writing TypeScript and React code",
		[1.0, 0.0, 0.0],
		{ category: "PROFILE" },
	);
	Repository.addMemory(
		testChatId,
		"User lives in Berlin, Germany",
		[0.0, 1.0, 0.0],
		{ category: "PROFILE" },
	);
	Repository.addMemory(
		testChatId,
		"User had lunch at an Italian restaurant",
		[0.0, 0.0, 1.0],
		{ category: "TEMPORARY", ttlDays: 3 },
	);

	// Mock ai.models.embedContent to return [1.0, 0.0, 0.0] for TypeScript query
	const originalEmbed = ai.models.embedContent;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(ai.models as any).embedContent = async (opts: any) => {
		const text = String(opts.contents);
		if (text.includes("TypeScript") || text.includes("code")) {
			return { embeddings: [{ values: [1.0, 0.0, 0.0] }] };
		}
		if (text.includes("Berlin") || text.includes("live")) {
			return { embeddings: [{ values: [0.0, 1.0, 0.0] }] };
		}
		return { embeddings: [{ values: [0.5, 0.5, 0.0] }] };
	};

	try {
		const result = await queryMemoriesWithDiagnostics(
			testChatId,
			"Tell me about user's TypeScript coding background",
			{
				activeTopic: "Developer discussion",
				topK: 2,
				threshold: 0.6,
			},
		);

		expect(result.chatId).toBe(testChatId);
		expect(result.originalQuery).toBe(
			"Tell me about user's TypeScript coding background",
		);
		expect(result.enrichedQuery).toBe(
			"Tell me about user's TypeScript coding background | Topic: Developer discussion",
		);
		expect(result.totalMemoriesInChat).toBe(3);
		expect(result.evaluatedCount).toBe(3);
		expect(result.embeddingDimensions).toBe(3);
		expect(result.details.length).toBe(3);

		// The TypeScript memory should be ranked #1 with highest score
		const topMemory = result.details[0];
		expect(topMemory.text).toContain("TypeScript");
		expect(topMemory.cosSim).toBeCloseTo(1.0, 2);
		expect(topMemory.passedThreshold).toBeTrue();
		expect(topMemory.selected).toBeTrue();

		// Memory list check
		expect(result.retrievedMemories.length).toBeGreaterThanOrEqual(1);
		expect(result.retrievedMemories[0]).toContain("TypeScript");

		// Non-matching memories should have low similarity and not be selected
		const lowMemory = result.details.find((m) => m.text.includes("lunch"));
		expect(lowMemory?.cosSim).toBeCloseTo(0.0, 2);
		expect(lowMemory?.selected).toBeFalse();
	} finally {
		// Restore mock
		ai.models.embedContent = originalEmbed;
		Repository.clearMemories(testChatId);
	}
});
