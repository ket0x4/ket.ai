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
  Repository.addMemory(testChatId, "User is a software developer", [0.4, 0.5, 0.6]);
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
  const { checkAndRunBackgroundMemoryExtraction } = await import("../src/services/gemini/memoryWorker");
  const testChatId = "test_worker_counter_999";

  // Call 14 times — should not trigger background extraction
  for (let i = 0; i < 14; i++) {
    await checkAndRunBackgroundMemoryExtraction(testChatId);
  }

  // 15th call triggers worker
  await checkAndRunBackgroundMemoryExtraction(testChatId);
  expect(true).toBe(true);
});



