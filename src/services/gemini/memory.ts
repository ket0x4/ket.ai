import { ai } from "./client";
import { runWithRetry, getSystemInstruction } from "./utils";
import { Repository } from "../../db/repository";
import { cosineSimilarity } from "../../utils/vector";
import { CONFIG } from "../../config/index";
import logger from "../../utils/logger";

const newMemoriesCount = new Map<string, number>();

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await runWithRetry(() => ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
    }));
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    logger.error("Error generating embedding:", error);
    return [];
  }
}

export async function processNewMemory(chatIdStr: string, memoryText: string) {
  if (!memoryText || !memoryText.trim() || !chatIdStr) return;
  
  const dateStr = new Date().toLocaleString('tr-TR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
  const memText = `[${dateStr}] ${memoryText.trim()}`;
  const emb = await generateEmbedding(memText);
  if (emb.length === 0) {
    logger.warn(`[Memory Store] Skipped memory for chat ${chatIdStr} due to embedding failure:`, memText);
    return;
  }

  const existing = Repository.getMemories(chatIdStr);
  for (const m of existing) {
    if (m.embedding.length > 0 && cosineSimilarity(emb, m.embedding) > 0.85) {
      logger.debug(`[Memory Store] Skipped duplicate memory for chat ${chatIdStr}:`, memText);
      return;
    }
  }

  logger.info(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
  Repository.addMemory(chatIdStr, memText, emb);

  const count = (newMemoriesCount.get(chatIdStr) || 0) + 1;
  if (count >= 20) {
    newMemoriesCount.set(chatIdStr, 0);
    consolidateMemories(chatIdStr).catch(e => logger.error("Memory consolidation error:", e));
  } else {
    newMemoriesCount.set(chatIdStr, count);
  }
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
    logger.debug(`[Memory RAG] Retrieved ${topMemories.length} memories for query: "${query}"`);
    logger.debug(`[Memory RAG] Memories:`, topMemories);
  }
  return topMemories;
}

export async function consolidateMemories(chatIdStr: string) {
  const allMemories = Repository.getMemories(chatIdStr);
  if (allMemories.length < 10) return;

  const memoryListText = allMemories.map(m => `ID: ${m.id} | ${m.text}`).join("\n");

  const prompt = `Review the following memory list.
Find exact duplicates, resolved contradictions (e.g. if one says user lives in X and a newer one says user lives in Y, the older one is a contradiction), or completely useless/spam facts. 
Return ONLY a JSON array of the integer IDs of memories that should be permanently DELETED. Return an empty array [] if all memories are important and distinct.

Memories:
${memoryListText}`;

  logger.info(`[Memory Consolidation] Triggered for chat ${chatIdStr}. Analyzing ${allMemories.length} memories...`);

  try {
    const response = await runWithRetry(() => ai.models.generateContent({
      model: CONFIG.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(),
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "INTEGER",
          },
          description: "List of memory IDs to delete"
        }
      },
    }));

    const responseText = response.text?.trim() || "[]";
    const idsToDelete: number[] = JSON.parse(responseText);

    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
      Repository.deleteMemoriesByIds(idsToDelete);
      logger.info(`[Memory Consolidation] Successfully deleted ${idsToDelete.length} redundant/spam memories for chat ${chatIdStr}.`);
    } else {
      logger.info(`[Memory Consolidation] No redundant memories found for chat ${chatIdStr}.`);
    }
  } catch (error) {
    logger.error(`[Memory Consolidation] Error during consolidation for chat ${chatIdStr}:`, error);
  }
}
