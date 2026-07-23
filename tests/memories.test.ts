import { expect, test } from "bun:test";
import { Repository } from "../src/db/repository";
import { runMigrations } from "../src/db/index";

test("Memory pagination logic", () => {
  runMigrations();
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
