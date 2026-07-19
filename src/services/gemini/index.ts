import { ai } from "./client";
import { getSystemInstruction, runWithRetry, buildHistoryList, cleanUserText } from "./utils";
import { getRelevantMemories, processNewMemory } from "./memory";
import { CONFIG } from "../../config";
import { Repository } from "../../db/repository";
import type { MessageRow } from "../../db/repository";

const lastSummarizedCount = new Map<string, number>();

export const GeminiService = {
  async _generateResponse(
    history: MessageRow[],
    topicSummary: string | null,
    options: {
      isSpontaneous?: boolean;
      instruction?: string;
      media?: { buffer: Buffer; mimeType: string };
      replyDescription: string;
      fallbackEmpty: string;
      fallbackError: string;
      mediaFallbackText: string;
    }
  ): Promise<string> {
    try {
      const chatIdStr = history[0]?.chat_id.toString() || "";
      const lastMsg = history[history.length - 1];

      const lastMessageText = lastMsg
        ? (lastMsg.is_bot_reply ? (lastMsg.text || options.mediaFallbackText) : cleanUserText(lastMsg.text) || options.mediaFallbackText)
        : options.mediaFallbackText;

      const queryForMemory = options.isSpontaneous ? (topicSummary || "General chat") : lastMessageText;
      const memories = chatIdStr ? await getRelevantMemories(chatIdStr, queryForMemory) : [];

      const historyList = buildHistoryList(history);

      const inputPayload: any = {
        active_topic: topicSummary || "General chat is going on, no specific topic.",
        recent_messages: historyList,
        memories: memories,
      };

      if (options.instruction) {
        inputPayload.instruction = options.instruction;
      } else {
        const lastMessageUsernameSuffix = lastMsg && lastMsg.username ? ` (@${lastMsg.username})` : "";
        const lastMessageSender = lastMsg
          ? (lastMsg.is_bot_reply ? "You (ket.ai)" : `User: ${lastMsg.first_name || "Unnamed"}${lastMessageUsernameSuffix}`)
          : "User: unnamed";

        inputPayload.interaction_type = options.isSpontaneous ? "spontaneous_comment" : "direct_reply";
        inputPayload.current_message_to_reply = options.isSpontaneous ? undefined : {
          sender: lastMessageSender,
          text: lastMessageText
        };
      }

      const contents: any = options.media
        ? [
            {
              role: "user",
              parts: [
                { text: JSON.stringify(inputPayload) },
                {
                  inlineData: {
                    mimeType: options.media.mimeType,
                    data: options.media.buffer.toString("base64"),
                  },
                },
              ],
            },
          ]
        : JSON.stringify(inputPayload);

      const responseSchemaProperties: any = {
        reply: {
          type: "STRING",
          description: options.replyDescription
        },
        new_memory_update: {
          type: "STRING",
          description: "Summarize in 1 clear sentence the interests, preferences, or personal details about the users that may require if remembered in the future. Save if there is a meaningful detail, otherwise leave blank."
        }
      };



      const response = await runWithRetry(() => ai.models.generateContent({
        model: CONFIG.GEMINI_MODEL,
        contents: contents,
        config: {
          systemInstruction: getSystemInstruction(),
          temperature: options.media ? 0.8 : 0.85,
          maxOutputTokens: 250,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: responseSchemaProperties,
            required: ["reply"]
          }
        },
      }));

      const responseText = response.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);

        if (parsed.new_memory_update && parsed.new_memory_update.trim() && chatIdStr) {
          await processNewMemory(chatIdStr, parsed.new_memory_update);
        }

        return parsed.reply || options.fallbackEmpty;
      } catch (parseError) {
        console.warn("[Gemini JSON Parse Warning] Model output was not valid JSON, returning raw text:", responseText);
        return responseText || options.fallbackEmpty;
      }

    } catch (error) {
      console.error("Error in Gemini _generateResponse:", error);
      return options.fallbackError;
    }
  },

  async ensureTopicSummary(chatIdStr: string, currentTopic: string | null): Promise<string> {
    const currentCount = Repository.getMessageCount(chatIdStr);
    const lastCount = lastSummarizedCount.get(chatIdStr) || 0;

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

  async generateReply(
    history: MessageRow[],
    topicSummary: string | null,
    isSpontaneous: boolean = false
  ): Promise<string> {
    return this._generateResponse(history, topicSummary, {
      isSpontaneous,
      replyDescription: "The reply you will write to the chat. A short (1-2 sentences).",
      fallbackEmpty: CONFIG.MESSAGES.gemini_empty_reply_fallback,
      fallbackError: CONFIG.MESSAGES.gemini_error_reply_fallback,
      mediaFallbackText: "[Media]"
    });
  },

  async summarizeTopic(history: MessageRow[]): Promise<string> {
    try {
      if (history.length === 0) return "";

      const historyList = history.map((msg) => ({
        sender: msg.is_bot_reply ? "You (ket.ai)" : `User: ${msg.first_name || "Unnamed"}`,
        text: msg.text || "[Media]"
      }));

      const prompt = `Analyze the conversations below. Summarize the main topic of conversation or the situation being discussed by a person in a maximum of 1–2 sentences.`;

      const response = await runWithRetry(() => ai.models.generateContent({
        model: CONFIG.GEMINI_MODEL,
        contents: JSON.stringify({
          messages: historyList,
          instruction: prompt
        }),
        config: {
          systemInstruction: "You are an analysis expert. You summarize group chats in just 1-2 sentences.",
          temperature: 0.3,
          maxOutputTokens: 100,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              summary: {
                type: "STRING",
                description: "A 1-2 sentence text summarizing the current topic of the group chat."
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

  async generateImageReply(
    imageBuffer: Buffer,
    mimeType: string,
    history: MessageRow[],
    topicSummary: string | null
  ): Promise<string> {
    return this._generateResponse(history, topicSummary, {
      instruction: "Analyze the photo and make a comment suitable for this photo.",
      media: { buffer: imageBuffer, mimeType },
      replyDescription: "The reply you will write to the photo and the flow of the conversation.",
      fallbackEmpty: CONFIG.MESSAGES.gemini_empty_image_fallback,
      fallbackError: CONFIG.MESSAGES.gemini_error_image_fallback,
      mediaFallbackText: "[Photo]"
    });
  },

  async generateVoiceReply(
    audioBuffer: Buffer,
    mimeType: string,
    history: MessageRow[],
    topicSummary: string | null
  ): Promise<string> {
    return this._generateResponse(history, topicSummary, {
      instruction: "The user sent a voice message. Listen, understand what is being said, and answer in a friendly way suitable for the conversation.",
      media: { buffer: audioBuffer, mimeType },
      replyDescription: "The reply you will write to the voice message and the flow of the conversation.",
      fallbackEmpty: "I heard the voice message but didn't know what to say.",
      fallbackError: "I got confused while listening to the voice message, can you try again?",
      mediaFallbackText: "[Voice]"
    });
  },
};
