import { ai } from "./client";
import { runWithRetry } from "./utils";
import { Repository } from "../../db/repository";
import { cosineSimilarity } from "../../utils/vector";

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await runWithRetry(() => ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
    }));
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
}

export async function processNewMemory(chatIdStr: string, memoryText: string) {
  if (!memoryText || !memoryText.trim() || !chatIdStr) return;
  const memText = memoryText.trim();
  const emb = await generateEmbedding(memText);

  const existing = Repository.getMemories(chatIdStr);
  for (const m of existing) {
    if (m.embedding.length > 0 && cosineSimilarity(emb, m.embedding) > 0.85) {
      console.log(`[Memory Store] Skipped duplicate memory for chat ${chatIdStr}:`, memText);
      return;
    }
  }

  console.log(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
  Repository.addMemory(chatIdStr, memText, emb);
}

export async function getRelevantMemories(chatId: string, query: string, topK = 5): Promise<string[]> {
  const allMemories = Repository.getMemories(chatId);
  if (allMemories.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  if (queryEmbedding.length === 0) {
     return allMemories.map(m => m.text).slice(0, topK);
  }

  // Calculate similarity and sort
  const scored = allMemories.map(m => ({
    text: m.text,
    score: m.embedding.length > 0 ? cosineSimilarity(queryEmbedding, m.embedding) : -1
  }));

  scored.sort((a, b) => b.score - a.score);
  const THRESHOLD = 0.60;
  const topMemories = scored
    .filter(s => s.score >= THRESHOLD)
    .slice(0, topK)
    .map(s => s.text);
  if (topMemories.length > 0) {
    console.log(`[Memory RAG] Retrieved ${topMemories.length} memories for query: "${query}"`);
    console.log(`[Memory RAG] Memories:`, topMemories);
  }
  return topMemories;
}
