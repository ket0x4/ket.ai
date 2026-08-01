import { readFileSync, existsSync } from "fs";
import type { MessageRow } from "../../db/repository";
import logger from "../../utils/logger";

const SYSTEM_PROMPT_FILE = "system.txt";

let cachedSystemPrompt: string | null = null;

function loadSystemPrompt(): string {
  if (!existsSync(SYSTEM_PROMPT_FILE)) {
    logger.error(
      "FATAL: system.txt not found! Bot cannot function without a system prompt.",
    );
    process.exit(1);
  }
  try {
    return readFileSync(SYSTEM_PROMPT_FILE, "utf-8").trim();
  } catch (e) {
    logger.error("FATAL: Error reading system.txt:", e);
    process.exit(1);
  }
}

// Load once at module initialization
cachedSystemPrompt = loadSystemPrompt();

export function getSystemInstruction(): string {
  return cachedSystemPrompt!;
}

/**
 * Reloads the system prompt from disk. Useful for hot-reloading
 * the prompt without restarting the bot.
 */
export function reloadSystemPrompt(): void {
  cachedSystemPrompt = loadSystemPrompt();
  logger.info("[SystemPrompt] Reloaded system.txt from disk.");
}

export async function runWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500,
): Promise<T> {
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
        logger.warn(
          `[Gemini] Transient error encountered (Attempt ${i + 1}/${retries}). Retrying in ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export function cleanUserText(text: string | null): string {
  if (!text) return "";
  return text.replace(/\bket\b/gi, "").trim();
}

export function buildHistoryList(history: MessageRow[]) {
  return history.map((msg) => {
    const usernameSuffix = msg.username ? ` (@${msg.username})` : "";
    const senderName = msg.is_bot_reply
      ? "You (ket.ai)"
      : `User: ${msg.first_name || "Unnamed"}${usernameSuffix}`;
    const fallback = msg.photo_file_id ? "[Photo]" : "[Media]";
    return {
      sender: senderName,
      reply_to_message_id: msg.reply_to_message_id || undefined,
      text: msg.is_bot_reply
        ? msg.text || fallback
        : cleanUserText(msg.text) || fallback,
    };
  });
}
