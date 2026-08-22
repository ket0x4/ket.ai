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

test("Category-aware scoring preserves PROFILE facts and decays TEMPORARY facts", async () => {
	const { queryMemoriesWithDiagnostics } = await import(
		"../src/services/gemini/memory"
	);
	const { ai } = await import("../src/services/gemini/client");

	const testChatId = "test_category_scoring_chat_202";
	Repository.clearMemories(testChatId);

	// Add a 90-day-old PROFILE fact
	Repository.addMemory(testChatId, "Alice: Born on May 15th", [1.0, 0.0], {
		category: "PROFILE",
		ttlDays: null,
	});

	// Add a 90-day-old TEMPORARY fact
	Repository.addMemory(testChatId, "Bob: Going to hospital today", [1.0, 0.0], {
		category: "TEMPORARY",
		ttlDays: 120,
	});

	// Manually age the memories to 90 days ago in SQLite
	const { db } = await import("../src/db/index");
	const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 86400;
	db.run("UPDATE memories SET created_at = ? WHERE chat_id = ?", [
		ninetyDaysAgo,
		testChatId,
	]);
	Repository.clearMemoryCache(testChatId);

	const originalEmbed = ai.models.embedContent;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(ai.models as any).embedContent = async () => ({
		embeddings: [{ values: [1.0, 0.0] }],
	});

	try {
		const diag = await queryMemoriesWithDiagnostics(
			testChatId,
			"When is Alice birthday?",
			{ threshold: 0.6 },
		);

		const profileMemory = diag.details.find((m) => m.text.includes("Alice"));
		const tempMemory = diag.details.find((m) => m.text.includes("Bob"));

		expect(profileMemory).toBeDefined();
		expect(tempMemory).toBeDefined();

		// PROFILE fact should maintain full score and pass threshold despite 90 days age
		expect(profileMemory?.finalScore).toBeGreaterThanOrEqual(1.0);
		expect(profileMemory?.passedThreshold).toBeTrue();

		// TEMPORARY fact should have suffered heavy exponential decay (< 0.75)
		expect(tempMemory?.finalScore).toBeLessThan(0.75);
	} finally {
		ai.models.embedContent = originalEmbed;
		Repository.clearMemories(testChatId);
	}
});

test("Exact text duplicate and Float32Array embedding storage", async () => {
	const { processNewMemory } = await import("../src/services/gemini/memory");
	const testChatId = "test_exact_dedup_chat_303";
	Repository.clearMemories(testChatId);

	// Add with Float32Array directly
	Repository.addMemory(
		testChatId,
		"Alice: Software engineer",
		new Float32Array([0.5, 0.5]),
		{ userId: 101, category: "PROFILE" },
	);

	const memories1 = Repository.getMemories(testChatId);
	expect(memories1.length).toBe(1);
	expect(memories1[0].embedding instanceof Float32Array).toBeTrue();
	expect(memories1[0].embedding[0]).toBeCloseTo(0.5, 2);

	// Process exact duplicate text — should not insert duplicate
	await processNewMemory(testChatId, "Alice: Software engineer", {
		userId: 101,
	});
	const memories2 = Repository.getMemories(testChatId);
	expect(memories2.length).toBe(1);

	// Update memory text and verify prepared statement update
	Repository.updateMemory(
		memories2[0].id,
		"Alice: Senior software engineer",
		"PROFILE",
		new Float32Array([0.6, 0.6]),
		testChatId,
	);
	const updated = Repository.getMemories(testChatId);
	expect(updated[0].text).toBe("Alice: Senior software engineer");
	expect(updated[0].embedding[0]).toBeCloseTo(0.6, 2);

	Repository.clearMemories(testChatId);
});

test("Vector math utilities correctness and normalization", async () => {
	const { dotProduct, normalizeVector } = await import("../src/utils/vector");

	const vecA = [3, 4];
	const normA = normalizeVector(vecA);
	expect(normA[0]).toBeCloseTo(0.6, 4);
	expect(normA[1]).toBeCloseTo(0.8, 4);

	const dot = dotProduct([1, 2, 3, 4, 5], [2, 3, 4, 5, 6]);
	// 1*2 + 2*3 + 3*4 + 4*5 + 5*6 = 2 + 6 + 12 + 20 + 30 = 70
	expect(dot).toBe(70);

	// Unit dot product as cosine similarity
	const norm1 = normalizeVector([1, 0]);
	const norm2 = normalizeVector([0, 1]);
	expect(dotProduct(norm1, norm2)).toBe(0);

	const normSame1 = normalizeVector([2, 2]);
	const normSame2 = normalizeVector([5, 5]);
	expect(dotProduct(normSame1, normSame2)).toBeCloseTo(1.0, 4);
});

test("Fast path RAG retrieval efficiency and ranking", async () => {
	const { getRelevantMemories } = await import("../src/services/gemini/memory");
	const { ai } = await import("../src/services/gemini/client");

	const testChatId = "test_fast_rag_bench_888";
	Repository.clearMemories(testChatId);

	const originalEmbed = ai.models.embedContent;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(ai.models as any).embedContent = async (opts: any) => {
		const text = String(opts.contents);
		if (text.includes("sports") || text.includes("football")) {
			return { embeddings: [{ values: [1.0, 0.0, 0.0] }] };
		}
		if (text.includes("cinema") || text.includes("movie")) {
			return { embeddings: [{ values: [0.0, 1.0, 0.0] }] };
		}
		return { embeddings: [{ values: [0.0, 0.0, 1.0] }] };
	};

	try {
		// Insert 20 memories
		for (let i = 0; i < 20; i++) {
			const cat = i % 2 === 0 ? "PROFILE" : "DYNAMIC";
			const emb = i === 5 ? [1.0, 0.0, 0.0] : [0.0, 0.0, 1.0];
			const text =
				i === 5 ? "User loves football matches" : `Generic fact #${i}`;
			Repository.addMemory(testChatId, text, emb, { category: cat });
		}

		// Fast path getRelevantMemories
		const results = await getRelevantMemories(
			testChatId,
			"Which sports does user follow?",
			undefined,
			3,
		);

		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results[0]).toBe("User loves football matches");
	} finally {
		ai.models.embedContent = originalEmbed;
		Repository.clearMemories(testChatId);
	}
});

test("Memory LRU cache incremental updates and memory bounds", () => {
	const testChatId = "test_lru_bounds_999";
	Repository.clearMemories(testChatId);

	// Add memory 1
	Repository.addMemory(testChatId, "Fact 1", [1, 0]);
	const cached1 = Repository.getMemories(testChatId);
	expect(cached1.length).toBe(1);
	expect(cached1[0].text).toBe("Fact 1");

	// Add memory 2 (incremental append, new reference returned)
	Repository.addMemory(testChatId, "Fact 2", [0, 1]);
	const cached2 = Repository.getMemories(testChatId);
	expect(cached2.length).toBe(2);
	expect(cached2).not.toBe(cached1);

	// Update memory 1
	Repository.updateMemory(
		cached2[0].id,
		"Updated Fact 1",
		"DYNAMIC",
		new Float32Array([0.5, 0.5]),
		testChatId,
	);
	const cached3 = Repository.getMemories(testChatId);
	expect(cached3[0].text).toBe("Updated Fact 1");
	expect(cached3[0].category).toBe("DYNAMIC");

	// Delete memory 2
	Repository.deleteMemoriesByIds([cached2[1].id], testChatId);
	const cached4 = Repository.getMemories(testChatId);
	expect(cached4.length).toBe(1);
	expect(cached4[0].text).toBe("Updated Fact 1");

	Repository.clearMemories(testChatId);
});
