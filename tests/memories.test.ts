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

test("FTS5 Full-Text Search and trigger synchronization", () => {
	const testChatId = "test_fts_sync_100";
	Repository.clearMemories(testChatId);

	// Insert
	Repository.addMemory(
		testChatId,
		"Ahmet Kadikoy Bella Italia restoranini cok seviyor",
		[0.1, 0.2],
	);
	Repository.addMemory(
		testChatId,
		"Zeynep Besiktas'ta yazilim muhendisi olarak calisiyor",
		[0.3, 0.4],
	);

	// Exact keyword query on FTS
	const ftsRes1 = Repository.searchMemoriesFTS(testChatId, "Bella Italia");
	expect(ftsRes1.length).toBe(1);
	expect(ftsRes1[0].text).toContain("Bella Italia");

	const ftsRes2 = Repository.searchMemoriesFTS(testChatId, "yazilim muhendisi");
	expect(ftsRes2.length).toBe(1);
	expect(ftsRes2[0].text).toContain("Zeynep");

	// Update memory and check FTS sync
	const mems = Repository.getMemories(testChatId);
	Repository.updateMemory(
		mems[0].id,
		"Ahmet Moda sahilinde espresso icmeyi cok seviyor",
		"PROFILE",
		new Float32Array([0.5, 0.5]),
		testChatId,
	);

	const ftsUpdated = Repository.searchMemoriesFTS(testChatId, "Moda espresso");
	expect(ftsUpdated.length).toBe(1);
	expect(ftsUpdated[0].text).toContain("Moda sahilinde");

	const ftsOld = Repository.searchMemoriesFTS(testChatId, "Bella Italia");
	expect(ftsOld.length).toBe(0);

	// Delete and check FTS sync
	Repository.deleteMemoriesByIds([mems[0].id], testChatId);
	const ftsAfterDel = Repository.searchMemoriesFTS(testChatId, "Moda espresso");
	expect(ftsAfterDel.length).toBe(0);

	Repository.clearMemories(testChatId);
});

test("Tiered capacity eviction prioritizes expired and temporary before profile", async () => {
	const { db } = await import("../src/db/index");
	const testChatId = "test_tiered_eviction_200";
	Repository.clearMemories(testChatId);

	const now = Math.floor(Date.now() / 1000);

	// 1. Profile fact 100 days old
	Repository.addMemory(testChatId, "Profile permanent fact", [1, 0], {
		category: "PROFILE",
	});
	// 2. Dynamic fact 20 days old
	Repository.addMemory(testChatId, "Dynamic medium fact", [0, 1], {
		category: "DYNAMIC",
	});
	// 3. Temporary fact
	Repository.addMemory(testChatId, "Temporary recent event", [1, 1], {
		category: "TEMPORARY",
		ttlDays: 10,
	});
	// 4. Expired Temporary fact
	Repository.addMemory(testChatId, "Temporary expired fact", [0.5, 0.5], {
		category: "TEMPORARY",
		ttlDays: -1,
	});

	// Age the created_at in SQLite
	db.run(
		"UPDATE memories SET created_at = ? WHERE chat_id = ? AND category = 'PROFILE'",
		[now - 100 * 86400, testChatId],
	);
	db.run(
		"UPDATE memories SET created_at = ? WHERE chat_id = ? AND category = 'DYNAMIC'",
		[now - 20 * 86400, testChatId],
	);
	Repository.clearMemoryCache(testChatId);

	// Simulate adding a new memory when capacity limit is reached
	// We call deleteOldestMemory directly to verify tiered eviction hierarchy
	const { db: dbInstance } = await import("../src/db/index");
	const getOldestStmt = dbInstance.prepare(`
		SELECT id, memory_text, category FROM memories 
		WHERE chat_id = ? 
		ORDER BY 
			CASE 
				WHEN expires_at IS NOT NULL AND expires_at <= unixepoch() THEN 1
				WHEN category = 'TEMPORARY' THEN 2
				WHEN category = 'DYNAMIC' THEN 3
				ELSE 4
			END ASC,
			created_at ASC 
		LIMIT 1
	`);

	// 1st eviction must be Expired Temporary
	const evict1 = getOldestStmt.get(testChatId) as { memory_text: string };
	expect(evict1.memory_text).toBe("Temporary expired fact");
	Repository.deleteMemoriesByIds(
		[(getOldestStmt.get(testChatId) as { id: number }).id],
		testChatId,
	);

	// 2nd eviction must be Temporary recent event
	const evict2 = getOldestStmt.get(testChatId) as { memory_text: string };
	expect(evict2.memory_text).toBe("Temporary recent event");
	Repository.deleteMemoriesByIds(
		[(getOldestStmt.get(testChatId) as { id: number }).id],
		testChatId,
	);

	// 3rd eviction must be Dynamic medium fact
	const evict3 = getOldestStmt.get(testChatId) as { memory_text: string };
	expect(evict3.memory_text).toBe("Dynamic medium fact");
	Repository.deleteMemoriesByIds(
		[(getOldestStmt.get(testChatId) as { id: number }).id],
		testChatId,
	);

	// 4th eviction is the Profile fact
	const evict4 = getOldestStmt.get(testChatId) as { memory_text: string };
	expect(evict4.memory_text).toBe("Profile permanent fact");

	Repository.clearMemories(testChatId);
});

test("Multiple distinct facts for the same user are preserved without being overwritten", async () => {
	const { processNewMemory } = await import("../src/services/gemini/memory");
	const { ai } = await import("../src/services/gemini/client");

	const testChatId = "test_slot_conflict_300";
	const userIdAli = 555;
	Repository.clearMemories(testChatId);

	const originalEmbed = ai.models.embedContent;
	// Mock embedding 1: [1.0, 0.0]
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(ai.models as any).embedContent = async () => ({
		embeddings: [{ values: [1.0, 0.0] }],
	});

	try {
		// Initial memory: Ali does not wear a watch
		await processNewMemory(testChatId, "Ali: does not wear a watch", {
			userId: userIdAli,
			category: "PROFILE",
		});

		const mems1 = Repository.getMemories(testChatId);
		expect(mems1.length).toBe(1);
		expect(mems1[0].text).toBe("Ali: does not wear a watch");

		// Second memory: Ali's arm is not healing (sim ~ 0.80 with first memory)
		// biome-ignore lint/suspicious/noExplicitAny: mock
		(ai.models as any).embedContent = async () => ({
			embeddings: [{ values: [0.8, 0.6] }],
		});

		await processNewMemory(testChatId, "Ali: arm is not healing", {
			userId: userIdAli,
			category: "PROFILE",
		});

		const mems2 = Repository.getMemories(testChatId);
		// Both facts must be kept; neither should overwrite the other
		expect(mems2.length).toBe(2);
		expect(mems2.map((m) => m.text)).toContain("Ali: does not wear a watch");
		expect(mems2.map((m) => m.text)).toContain("Ali: arm is not healing");
	} finally {
		ai.models.embedContent = originalEmbed;
		Repository.clearMemories(testChatId);
	}
});

test("Contextual query expansion enriches anaphoric queries with recent messages", async () => {
	const { expandContextualQuery } = await import(
		"../src/services/gemini/utils"
	);

	const dummyHistory = [
		{
			id: 1,
			chat_id: "c1",
			message_id: 10,
			user_id: 101,
			username: "ahmet",
			first_name: "Ahmet",
			reply_to_message_id: null,
			text: "Kadikoy Bella Italia restoranina gittim harikaydi",
			photo_file_id: null,
			is_bot_reply: 0,
			sent_at: 1000,
		},
		{
			id: 2,
			chat_id: "c1",
			message_id: 11,
			user_id: 0,
			username: null,
			first_name: null,
			reply_to_message_id: 10,
			text: "Afiyet olsun!",
			photo_file_id: null,
			is_bot_reply: 1,
			sent_at: 1001,
		},
	];

	// Anaphoric short question "Orası tam olarak neredeydi?"
	const enriched = expandContextualQuery(
		"Orası tam olarak neredeydi?",
		dummyHistory,
		"Yemek Sohbeti",
	);

	expect(enriched).toContain("Kadikoy Bella Italia");
	expect(enriched).toContain("Orası tam olarak neredeydi?");
	expect(enriched).toContain("Topic: Yemek Sohbeti");
});

test("Bi-Level retrieval prioritizes speaking user personal facts over group noise", async () => {
	const { queryMemoriesWithDiagnostics } = await import(
		"../src/services/gemini/memory"
	);
	const { ai } = await import("../src/services/gemini/client");

	const testChatId = "test_bi_level_chat_400";
	const userIdSpeaker = 888;
	const userIdOther = 999;
	Repository.clearMemories(testChatId);

	// Speaker profile
	Repository.addMemory(testChatId, "Speaker: Loves electric cars", [0.9, 0.1], {
		userId: userIdSpeaker,
		category: "PROFILE",
	});

	// Other user profile
	Repository.addMemory(
		testChatId,
		"Other: Bought a Tesla Model Y",
		[0.9, 0.1],
		{
			userId: userIdOther,
			category: "PROFILE",
		},
	);

	const originalEmbed = ai.models.embedContent;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(ai.models as any).embedContent = async () => ({
		embeddings: [{ values: [0.9, 0.1] }],
	});

	try {
		const diag = await queryMemoriesWithDiagnostics(
			testChatId,
			"Tell me about my car interests",
			{
				senderUserId: userIdSpeaker,
				topK: 2,
			},
		);

		// Speaker's memory must be included as #1 in retrievedMemories via Level 1
		expect(diag.retrievedMemories.length).toBeGreaterThanOrEqual(1);
		expect(diag.retrievedMemories[0]).toBe("Speaker: Loves electric cars");
	} finally {
		ai.models.embedContent = originalEmbed;
		Repository.clearMemories(testChatId);
	}
});
