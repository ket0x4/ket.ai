import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "../config/index.ts";
import { Repository } from "../db/repository.ts";
import type { MessageRow } from "../db/repository.ts";
import { readFileSync, existsSync } from "fs";
import { cosineSimilarity } from "../utils/vector.ts";

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({ apiKey: CONFIG.GEMINI_API_KEY });
const lastSummarizedCount = new Map<string, number>();

function getSystemInstruction(): string {
  const SYSTEM_PROMPT_FILE = "system.txt";
  if (!existsSync(SYSTEM_PROMPT_FILE)) {
    console.error("FATAL: system.txt not found! Bot cannot function without a system prompt.");
    process.exit(1);
  }
  try {
    return readFileSync(SYSTEM_PROMPT_FILE, "utf-8").trim();
  } catch (e) {
    console.error("FATAL: Error reading system.txt:", e);
    process.exit(1);
  }
}

// Helper to retry Gemini requests on transient errors (like 503/429)
async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      const status = error.status || 0;
      
      const isTransient = 
        status === 503 || 
        status === 429 || 
        errorMessage.includes("503") || 
        errorMessage.includes("429") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") || 
        errorMessage.includes("high demand");

      if (isTransient && i < retries - 1) {
        console.warn(`[Gemini] Transient error encountered (Attempt ${i + 1}/${retries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

async function generateEmbedding(text: string): Promise<number[]> {
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

async function getRelevantMemories(chatId: string, query: string, topK = 5): Promise<string[]> {
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

export const GeminiService = {
  /**
   * Ensures the topic summary is up-to-date before generating a reply.
   * Runs the summarizer only if enough messages have passed or no topic exists.
   */
  async ensureTopicSummary(chatIdStr: string, currentTopic: string | null): Promise<string> {
    const currentCount = Repository.getMessageCount(chatIdStr);
    const lastCount = lastSummarizedCount.get(chatIdStr) || 0;
    
    // If we have no topic yet, or if 20+ messages have passed
    if (!currentTopic || currentCount - lastCount >= 20) {
      console.log(`[Summarizer] Triggering on-demand topic summary for group ${chatIdStr}...`);
      const history = Repository.getRecentMessages(chatIdStr, 30);
      const summary = await this.summarizeTopic(history);
      if (summary) {
        Repository.updateChatSettings(chatIdStr, { current_topic: summary });
        lastSummarizedCount.set(chatIdStr, currentCount);
        console.log(`[Summarizer] New topic summary for ${chatIdStr}: "${summary}"`);
        return summary;
      }
    }
    
    return currentTopic || "";
  },

  /**
   * Generates a reply to the group chat based on recent history and active topic.
   */
  async generateReply(
    history: MessageRow[],
    topicSummary: string | null,
    isSpontaneous: boolean = false
  ): Promise<string> {
    try {
      const chatIdStr = history[0]?.chat_id.toString() || "";

      // Extract the last message which is the target of the reply
      const lastMsg = history[history.length - 1];
      const lastMessageText = lastMsg ? (lastMsg.text || "[Medya]") : "";
      const lastMessageUsernameSuffix = lastMsg && lastMsg.username ? ` (@${lastMsg.username})` : "";
      const lastMessageSender = lastMsg 
        ? (lastMsg.is_bot_reply ? "Sen (ket)" : `Kullanıcı: ${lastMsg.first_name || "İsimsiz"}${lastMessageUsernameSuffix}`)
        : "Kullanıcı: İsimsiz";

      // Build clean history array for JSON payload
      const historyList = history.map((msg) => {
        const usernameSuffix = msg.username ? ` (@${msg.username})` : "";
        const senderName = msg.is_bot_reply ? "Sen (ket)" : `Kullanıcı: ${msg.first_name || "İsimsiz"}${usernameSuffix}`;
        return {
          sender: senderName,
          reply_to: msg.reply_to_first_name || undefined,
          text: msg.text || (msg.photo_file_id ? "[Fotoğraf]" : "[Medya]")
        };
      });

      // Load relevant long-term memory records for this chat based on context
      const queryForMemory = isSpontaneous ? (topicSummary || "Genel sohbet") : lastMessageText;
      const memories = chatIdStr ? await getRelevantMemories(chatIdStr, queryForMemory) : [];

      // Construct structured JSON input
      const inputPayload = {
        active_topic: topicSummary || "Genel sohbet dönyor, özel bir konu yok.",
        recent_messages: historyList,
        memories: memories,
        interaction_type: isSpontaneous ? "spontaneous_comment" : "direct_reply",
        current_message_to_reply: isSpontaneous ? undefined : {
          sender: lastMessageSender,
          text: lastMessageText
        }
      };

      const systemInstruction = getSystemInstruction();

      const response = await runWithRetry(() => ai.models.generateContent({
        model: CONFIG.GEMINI_MODEL,
        contents: JSON.stringify(inputPayload),
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.85,
          maxOutputTokens: 250,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: {
                type: "STRING",
                description: "Sohbete yazacağın yanıt. Kısa (1-2 cümle), samimi, noktalama kurallarına uymayan, küçük harflerle yazılmış shitpostçu kanka tavrında bir mesaj."
              },
              mood: {
                type: "STRING",
                description: "Yazarken takındığın tavır veya ruh hali."
              },
              new_memory_update: {
                type: "STRING",
                description: "Gelecekte hatırlamanın faydalı olacağı kalıcı tercihleri veya kişisel bilgileri 1 net cümleyle özetle. ÖNEMLİ: Bilgiyi kaydederken ASLA 'Kullanıcı' deme, her zaman bilgiyi veren kişinin mesaj geçmişindeki ismini kullan (örn: 'Ket arch linux kullanıyor'). Anlık muhabbetleri kaydetme. Değerli bilgi yoksa boş bırak."
              }
            },
            required: ["reply"]
          }
        },
      }));

      const responseText = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);
        
        // Save new memory if extracted by the model
        if (parsed.new_memory_update && parsed.new_memory_update.trim() && chatIdStr) {
          const memText = parsed.new_memory_update.trim();
          console.log(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
          const emb = await generateEmbedding(memText);
          Repository.addMemory(chatIdStr, memText, emb);
        }

        return parsed.reply || CONFIG.MESSAGES.gemini_empty_reply_fallback;
      } catch (parseError) {
        console.warn("[Gemini JSON Parse Warning] Model output was not valid JSON, returning raw text:", responseText);
        return responseText || CONFIG.MESSAGES.gemini_empty_reply_fallback;
      }

    } catch (error) {
      console.error("Error in Gemini generateReply:", error);
      return CONFIG.MESSAGES.gemini_error_reply_fallback;
    }
  },

  /**
   * Summarizes a batch of messages to capture the current active topic.
   */
  async summarizeTopic(history: MessageRow[]): Promise<string> {
    try {
      if (history.length === 0) return "";

      const historyList = history.map((msg) => ({
        sender: msg.is_bot_reply ? "Sen (ket)" : `Kullanıcı: ${msg.first_name || "İsimsiz"}`,
        text: msg.text || "[Medya]"
      }));

      const prompt = `Aşağıdaki konuşmaları analiz et. Şu an grupta konuşulan ana konuyu veya tartışılan durumu maksimum 1-2 cümleyle özetle.`;

      const response = await runWithRetry(() => ai.models.generateContent({
        model: CONFIG.GEMINI_MODEL,
        contents: JSON.stringify({
          messages: historyList,
          instruction: prompt
        }),
        config: {
          systemInstruction: "Sen bir analiz uzmanısın. Grup sohbetlerini sadece 1-2 cümle ile özetlersin.",
          temperature: 0.3,
          maxOutputTokens: 100,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              summary: {
                type: "STRING",
                description: "Grup konuşmasının güncel konusunu özetleyen 1-2 cümlelik metin."
              }
            },
            required: ["summary"]
          }
        },
      }));

      const responseText = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);
        return parsed.summary || "";
      } catch {
        return responseText;
      }
    } catch (error) {
      console.error("Error in Gemini summarizeTopic:", error);
      return "";
    }
  },

  /**
   * Generates a reply when a photo is uploaded, analyzing the image.
   */
  async generateImageReply(
    imageBuffer: Buffer,
    mimeType: string,
    history: MessageRow[],
    topicSummary: string | null
  ): Promise<string> {
    try {
      const chatIdStr = history[0]?.chat_id.toString() || "";
      const lastMsg = history[history.length - 1];
      const lastMessageText = lastMsg ? (lastMsg.text || "[Fotoğraf]") : "[Fotoğraf]";
      const memories = chatIdStr ? await getRelevantMemories(chatIdStr, lastMessageText) : [];

      const historyList = history.map((msg) => {
        const usernameSuffix = msg.username ? ` (@${msg.username})` : "";
        const senderName = msg.is_bot_reply ? "Sen (ket)" : `Kullanıcı: ${msg.first_name || "İsimsiz"}${usernameSuffix}`;
        return {
          sender: senderName,
          reply_to: msg.reply_to_first_name || undefined,
          text: msg.text || "[Medya]"
        };
      });

      const inputPayload = {
        active_topic: topicSummary || "Genel sohbet",
        recent_messages: historyList,
        memories: memories,
        instruction: "Kullanıcı son olarak bir fotoğraf gönderdi. Fotoğrafı analiz et ve bu fotoğrafa uygun, hafif laf sokan ve samimi bir yorum yap. Eski yazışmalardaki isteklere cevap verme."
      };

      const response = await runWithRetry(() => ai.models.generateContent({
        model: CONFIG.GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: JSON.stringify(inputPayload) },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: getSystemInstruction(),
          temperature: 0.8,
          maxOutputTokens: 250,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: {
                type: "STRING",
                description: "Fotoğrafa ve konuşmanın gidişatına yazacağın yanıt. Kısa (1-2 cümle), hafif alaycı, samimi ve shitpostçu kanka tarzında olmalı."
              },
              mood: {
                type: "STRING",
                description: "Yazarken takındığın tavır veya ruh hali."
              },
              new_memory_update: {
                type: "STRING",
                description: "Gelecekte hatırlamanın faydalı olacağı kalıcı tercihleri veya kişisel bilgileri 1 net cümleyle özetle. ÖNEMLİ: Bilgiyi kaydederken ASLA 'Kullanıcı' deme, her zaman bilgiyi veren kişinin mesaj geçmişindeki ismini kullan (örn: 'Ket arch linux kullanıyor'). Anlık muhabbetleri kaydetme. Değerli bilgi yoksa boş bırak."
              }
            },
            required: ["reply"]
          }
        },
      }));

      const responseText = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);
        
        // Save new memory if extracted by the model
        if (parsed.new_memory_update && parsed.new_memory_update.trim() && chatIdStr) {
          const memText = parsed.new_memory_update.trim();
          console.log(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
          const emb = await generateEmbedding(memText);
          Repository.addMemory(chatIdStr, memText, emb);
        }

        return parsed.reply || CONFIG.MESSAGES.gemini_empty_image_fallback;
      } catch {
        return responseText || CONFIG.MESSAGES.gemini_empty_image_fallback;
      }
    } catch (error) {
      console.error("Error in Gemini generateImageReply:", error);
      return CONFIG.MESSAGES.gemini_error_image_fallback;
    }
  },

  /**
   * Generates a reply when a voice message is sent, analyzing the audio.
   */
  async generateVoiceReply(
    audioBuffer: Buffer,
    mimeType: string,
    history: MessageRow[],
    topicSummary: string | null
  ): Promise<string> {
    try {
      const chatIdStr = history[0]?.chat_id.toString() || "";
      const lastMsg = history[history.length - 1];
      const lastMessageText = lastMsg ? (lastMsg.text || "[Ses]") : "[Ses]";
      const memories = chatIdStr ? await getRelevantMemories(chatIdStr, lastMessageText) : [];

      const historyList = history.map((msg) => {
        const usernameSuffix = msg.username ? ` (@${msg.username})` : "";
        const senderName = msg.is_bot_reply ? "Sen (ket)" : `Kullanıcı: ${msg.first_name || "İsimsiz"}${usernameSuffix}`;
        return {
          sender: senderName,
          reply_to: msg.reply_to_first_name || undefined,
          text: msg.text || "[Medya]"
        };
      });

      const inputPayload = {
        active_topic: topicSummary || "Genel sohbet",
        recent_messages: historyList,
        memories: memories,
        instruction: "Kullanıcı bir sesli mesaj gönderdi. Sesli mesajı dinle, ne söylendiğini anla ve konuşmaya uygun, samimi bir şekilde cevap ver. Eğer ses anlaşılmıyorsa komik bir yorum yap."
      };

      const response = await runWithRetry(() => ai.models.generateContent({
        model: CONFIG.GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: JSON.stringify(inputPayload) },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audioBuffer.toString("base64"),
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: getSystemInstruction(),
          temperature: 0.8,
          maxOutputTokens: 250,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: {
                type: "STRING",
                description: "Sesli mesaja ve konuşmanın gidişatına yazacağın yanıt. Kısa (1-2 cümle), samimi ve shitpostçu kanka tarzında olmalı."
              },
              mood: {
                type: "STRING",
                description: "Yazarken takındığın tavır veya ruh hali."
              },
              new_memory_update: {
                type: "STRING",
                description: "Gelecekte hatırlamanın faydalı olacağı kalıcı tercihleri veya kişisel bilgileri 1 net cümleyle özetle. ÖNEMLİ: Bilgiyi kaydederken ASLA 'Kullanıcı' deme, her zaman bilgiyi veren kişinin mesaj geçmişindeki ismini kullan (örn: 'Ket arch linux kullanıyor'). Anlık muhabbetleri kaydetme. Değerli bilgi yoksa boş bırak."
              }
            },
            required: ["reply"]
          }
        },
      }));

      const responseText = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);

        // Save new memory if extracted by the model
        if (parsed.new_memory_update && parsed.new_memory_update.trim() && chatIdStr) {
          const memText = parsed.new_memory_update.trim();
          console.log(`[Memory Store] Adding memory to chat ${chatIdStr}:`, memText);
          const emb = await generateEmbedding(memText);
          Repository.addMemory(chatIdStr, memText, emb);
        }

        return parsed.reply || "Ses mesajını duydum ama ne diyeceğimi bilemedim.";
      } catch {
        return responseText || "Ses mesajını duydum ama ne diyeceğimi bilemedim.";
      }
    } catch (error) {
      console.error("Error in Gemini generateVoiceReply:", error);
      return "Ses mesajını dinlerken kafam karıştı, tekrar dener misin?";
    }
  },
};
