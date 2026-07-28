import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CONFIG, updateBotSettings } from "../config/index";
import { db } from "../db/index";
import { Repository } from "../db/repository";
import { processNewMemory } from "../services/gemini/memory";
import { ai } from "../services/gemini/client";
import { getSystemInstruction } from "../services/gemini/utils";
import { ToolTraceLogger } from "../utils/toolTrace";
import logger from "../utils/logger";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface AuthContext {
  valid: boolean;
  user?: TelegramUser;
  isOwner: boolean;
}

/**
 * Validates Telegram initData cryptographic signature.
 */
export function verifyTelegramInitData(initDataRaw: string, botToken: string): AuthContext {
  if (!initDataRaw) {
    return { valid: false, isOwner: false };
  }

  try {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get("hash");
    if (!hash) {
      return { valid: false, isOwner: false };
    }

    urlParams.delete("hash");

    const params: string[] = [];
    urlParams.forEach((val, key) => {
      params.push(`${key}=${val}`);
    });
    params.sort();

    const dataCheckString = params.join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash.toLowerCase() !== hash.toLowerCase()) {
      return { valid: false, isOwner: false };
    }

    const userStr = urlParams.get("user");
    const user: TelegramUser | undefined = userStr ? JSON.parse(userStr) : undefined;
    const isOwner = Boolean(
      user && CONFIG.BOT_OWNER_ID ? user.id === CONFIG.BOT_OWNER_ID : true
    );

    return { valid: true, user, isOwner };
  } catch (error) {
    logger.error("[Server Auth] Error validating initData:", error);
    return { valid: false, isOwner: false };
  }
}

/**
 * Extracts auth context from Request headers or query string.
 */
function getAuthContext(req: Request): AuthContext {
  const initData =
    req.headers.get("x-telegram-init-data") ||
    new URL(req.url).searchParams.get("initData") ||
    "";

  if (!initData) {
    // If running in local dev environment without bot owner configured, allow fallback for testing
    if (process.env.NODE_ENV === "development" || !CONFIG.BOT_OWNER_ID) {
      return {
        valid: true,
        user: { id: CONFIG.BOT_OWNER_ID || 1, first_name: "Admin" },
        isOwner: true,
      };
    }
    return { valid: false, isOwner: false };
  }

  const auth = verifyTelegramInitData(initData, CONFIG.TELEGRAM_BOT_TOKEN);
  
  // If BOT_OWNER_ID is not configured in environment/config, treat any valid Telegram user as owner
  if (auth.valid && !CONFIG.BOT_OWNER_ID) {
    auth.isOwner = true;
  }

  return auth;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

let serverInstance: ReturnType<typeof Bun.serve> | null = null;

export function startServer(): ReturnType<typeof Bun.serve> {
  const port = CONFIG.WEB_PORT;

  logger.info(`[Server] Starting Telegram Mini App HTTP server on port ${port}...`);

  serverInstance = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Handle CORS preflight options
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          },
        });
      }

      // API Routes
      if (pathname.startsWith("/api/")) {
        const auth = getAuthContext(req);

        if (!auth.valid) {
          return errorResponse("Unauthorized: Invalid Telegram initData", 401);
        }

        // 1. Auth check
        if (pathname === "/api/auth/verify" || pathname === "/api/me") {
          return jsonResponse({
            valid: true,
            user: auth.user,
            isOwner: auth.isOwner,
          });
        }

        // 2. Stats
        if (pathname === "/api/stats" && req.method === "GET") {
          try {
            const chatsRow = db.prepare("SELECT COUNT(*) as count FROM chats").get() as { count: number };
            const allowedRow = db.prepare("SELECT COUNT(*) as count FROM chats WHERE is_allowed = 1").get() as { count: number };
            const messagesRow = db.prepare("SELECT COUNT(*) as count FROM messages").get() as { count: number };
            const memoriesRow = db.prepare("SELECT COUNT(*) as count FROM memories").get() as { count: number };

            const memUsage = process.memoryUsage();

            return jsonResponse({
              totalChats: chatsRow?.count || 0,
              allowedChats: allowedRow?.count || 0,
              totalMessages: messagesRow?.count || 0,
              totalMemories: memoriesRow?.count || 0,
              uptimeSeconds: Math.floor(process.uptime()),
              memoryUsageMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
            });
          } catch (e) {
            logger.error("[Server Stats] Error fetching stats:", e);
            return errorResponse("Failed to fetch stats", 500);
          }
        }

        // 2b. Settings API
        if (pathname === "/api/settings") {
          if (req.method === "GET") {
            return jsonResponse({
              gemini_model: CONFIG.GEMINI_MODEL,
              default_reply_probability: CONFIG.DEFAULT_REPLY_PROBABILITY,
              chat_history_limit: CONFIG.CHAT_HISTORY_LIMIT,
              enable_web_search: CONFIG.ENABLE_WEB_SEARCH,
              max_agent_steps: CONFIG.MAX_AGENT_STEPS,
              log_level: CONFIG.LOG_LEVEL,
            });
          }

          if (req.method === "PATCH") {
            if (!auth.isOwner) {
              return errorResponse("Only bot owner can update global settings", 403);
            }
            try {
              const body = (await req.json()) as {
                gemini_model?: string;
                default_reply_probability?: number;
                chat_history_limit?: number;
                enable_web_search?: boolean;
                max_agent_steps?: number;
                log_level?: "debug" | "info" | "warn" | "error";
              };

              updateBotSettings(body);

              return jsonResponse({
                success: true,
                message: "Settings updated successfully",
                settings: {
                  gemini_model: CONFIG.GEMINI_MODEL,
                  default_reply_probability: CONFIG.DEFAULT_REPLY_PROBABILITY,
                  chat_history_limit: CONFIG.CHAT_HISTORY_LIMIT,
                  enable_web_search: CONFIG.ENABLE_WEB_SEARCH,
                  max_agent_steps: CONFIG.MAX_AGENT_STEPS,
                  log_level: CONFIG.LOG_LEVEL,
                },
              });
            } catch (e) {
              logger.error("[Server Settings PATCH] Error updating settings:", e);
              return errorResponse("Failed to update settings", 500);
            }
          }
        }

        // 3. Memories API
        if (pathname === "/api/memories") {
          if (req.method === "GET") {
            const chatIdParam = url.searchParams.get("chat_id");
            const searchParam = url.searchParams.get("search")?.toLowerCase() || "";
            const categoryParam = url.searchParams.get("category");

            let query = `
              SELECT id, chat_id, memory_text, created_at, user_id, category, expires_at 
              FROM memories 
            `;
            const conditions: string[] = [];
            const params: (string | number)[] = [];

            if (chatIdParam) {
              conditions.push("chat_id = ?");
              params.push(chatIdParam);
            }
            if (categoryParam) {
              conditions.push("category = ?");
              params.push(categoryParam);
            }

            if (conditions.length > 0) {
              query += " WHERE " + conditions.join(" AND ");
            }
            query += " ORDER BY created_at DESC LIMIT 500";

            const rows = db.prepare(query).all(...params) as {
              id: number;
              chat_id: string;
              memory_text: string;
              created_at: number;
              user_id: number | null;
              category: string;
              expires_at: number | null;
            }[];

            const filtered = rows.filter((r) =>
              searchParam ? r.memory_text.toLowerCase().includes(searchParam) : true
            );

            return jsonResponse(filtered);
          }

          if (req.method === "POST") {
            try {
              const body = (await req.json()) as {
                chatId: string;
                memoryText: string;
                category?: "PROFILE" | "DYNAMIC" | "TEMPORARY";
              };

              if (!body.chatId || !body.memoryText) {
                return errorResponse("Missing chatId or memoryText");
              }

              await processNewMemory(body.chatId, body.memoryText, {
                category: body.category || "PROFILE",
              });

              return jsonResponse({ success: true, message: "Memory created successfully" });
            } catch (e) {
              logger.error("[Server Memory POST] Error adding memory:", e);
              return errorResponse("Failed to create memory", 500);
            }
          }
        }

        // Delete memory by ID: /api/memories/:id
        if (pathname.startsWith("/api/memories/") && req.method === "DELETE") {
          const idStr = pathname.replace("/api/memories/", "");
          const id = parseInt(idStr, 10);
          if (isNaN(id)) {
            return errorResponse("Invalid memory ID");
          }

          try {
            Repository.deleteMemoriesByIds([id]);
            return jsonResponse({ success: true, message: `Memory ${id} deleted` });
          } catch (e) {
            logger.error("[Server Memory DELETE] Error deleting memory:", e);
            return errorResponse("Failed to delete memory", 500);
          }
        }

        // Export memories: GET /api/memories/export
        if (pathname === "/api/memories/export" && req.method === "GET") {
          try {
            const rows = db.prepare("SELECT chat_id, memory_text, created_at, user_id, category, expires_at FROM memories ORDER BY created_at DESC").all();
            return jsonResponse({
              exportedAt: new Date().toISOString(),
              total: rows.length,
              memories: rows,
            });
          } catch (e) {
            logger.error("[Server Export] Error exporting memories:", e);
            return errorResponse("Failed to export memories", 500);
          }
        }

        // Import memories: POST /api/memories/import
        if (pathname === "/api/memories/import" && req.method === "POST") {
          try {
            const body = (await req.json()) as {
              memories: Array<{ chatId?: string; chat_id?: string; memoryText?: string; memory_text?: string; category?: "PROFILE" | "DYNAMIC" | "TEMPORARY" }>;
            };

            if (!Array.isArray(body.memories)) {
              return errorResponse("Invalid format: memories array expected");
            }

            let count = 0;
            for (const mem of body.memories) {
              const chatId = mem.chatId || mem.chat_id;
              const text = mem.memoryText || mem.memory_text;
              if (chatId && text) {
                await processNewMemory(chatId, text, { category: mem.category || "PROFILE" });
                count++;
              }
            }

            return jsonResponse({ success: true, importedCount: count });
          } catch (e) {
            logger.error("[Server Import] Error importing memories:", e);
            return errorResponse("Failed to import memories", 500);
          }
        }

        // Tool Traces: GET /api/tool-traces
        if (pathname === "/api/tool-traces" && req.method === "GET") {
          return jsonResponse({ traces: ToolTraceLogger.getAll() });
        }

        // AI Sandbox: POST /api/sandbox
        if (pathname === "/api/sandbox" && req.method === "POST") {
          try {
            const body = (await req.json()) as { prompt: string; systemInstruction?: string };
            if (!body.prompt || !body.prompt.trim()) {
              return errorResponse("Prompt is required");
            }

            const startTime = Date.now();
            const systemPrompt = body.systemInstruction || getSystemInstruction();

            const response = await ai.models.generateContent({
              model: CONFIG.GEMINI_MODEL,
              contents: [{ role: "user", parts: [{ text: body.prompt }] }],
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.8,
                maxOutputTokens: 500,
              },
            });

            const durationMs = Date.now() - startTime;
            const replyText = response.text || "Empty response";

            return jsonResponse({
              reply: replyText,
              executionTimeMs: durationMs,
              model: CONFIG.GEMINI_MODEL,
            });
          } catch (e) {
            logger.error("[Server Sandbox] Error generating sandbox response:", e);
            return errorResponse("Failed to generate response: " + (e instanceof Error ? e.message : String(e)), 500);
          }
        }

        // 4. Chats API
        if (pathname === "/api/chats" && req.method === "GET") {
          try {
            const chats = db.prepare("SELECT * FROM chats ORDER BY created_at DESC").all() as {
              chat_id: string;
              title: string | null;
              reply_probability: number;
              last_random_reply_at: number;
              current_topic: string | null;
              is_allowed: number;
              created_at: number;
            }[];

            const result = chats.map((c) => {
              const stats = Repository.getChatStats(c.chat_id);
              const memCount = Repository.getMemories(c.chat_id).length;
              return {
                ...c,
                is_allowed: Boolean(c.is_allowed),
                stats,
                memoryCount: memCount,
              };
            });

            return jsonResponse(result);
          } catch (e) {
            logger.error("[Server Chats GET] Error fetching chats:", e);
            return errorResponse("Failed to fetch chats", 500);
          }
        }

        // Patch chat settings: /api/chats/:id
        if (pathname.startsWith("/api/chats/") && req.method === "PATCH") {
          const chatId = pathname.replace("/api/chats/", "");
          if (!chatId) return errorResponse("Invalid chat ID");

          try {
            const body = (await req.json()) as {
              is_allowed?: boolean;
              reply_probability?: number;
            };

            if (typeof body.is_allowed === "boolean") {
              Repository.setChatAllowed(chatId, body.is_allowed);
            }
            if (typeof body.reply_probability === "number") {
              Repository.updateChatSettings(chatId, {
                reply_probability: body.reply_probability,
              });
            }

            return jsonResponse({ success: true, message: `Chat ${chatId} updated` });
          } catch (e) {
            logger.error("[Server Chat PATCH] Error updating chat:", e);
            return errorResponse("Failed to update chat", 500);
          }
        }

        // 5. Logs API
        if (pathname === "/api/logs" && req.method === "GET") {
          try {
            const logType = url.searchParams.get("type") === "error" ? "error.log" : "app.log";
            const levelFilter = url.searchParams.get("level")?.toUpperCase();
            const searchFilter = url.searchParams.get("search")?.toLowerCase() || "";
            const limit = parseInt(url.searchParams.get("limit") || "150", 10);

            const logFilePath = path.join(process.cwd(), CONFIG.LOG_DIR, logType);

            if (!fs.existsSync(logFilePath)) {
              return jsonResponse({ logs: [] });
            }

            const rawContent = fs.readFileSync(logFilePath, "utf-8");
            const lines = rawContent.split("\n").filter((l) => l.trim().length > 0);
            const recentLines = lines.slice(-limit);

            const parsedLogs = recentLines
              .map((line, idx) => {
                const match = line.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3})\s+\[([A-Z]+)\s*\]\s+(.*)$/);
                if (match) {
                  return {
                    id: idx,
                    timestamp: match[1],
                    level: match[2],
                    message: match[3],
                    raw: line,
                  };
                }
                return {
                  id: idx,
                  timestamp: "",
                  level: "INFO",
                  message: line,
                  raw: line,
                };
              })
              .filter((log) => {
                if (levelFilter && levelFilter !== "ALL" && log.level !== levelFilter) {
                  return false;
                }
                if (searchFilter && !log.raw.toLowerCase().includes(searchFilter)) {
                  return false;
                }
                return true;
              });

            return jsonResponse({ logs: parsedLogs });
          } catch (e) {
            logger.error("[Server Logs GET] Error reading log file:", e);
            return errorResponse("Failed to read logs", 500);
          }
        }

        return errorResponse("Endpoint not found", 404);
      }

      // Static file serving for SPA
      try {
        let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
        
        // Prevent path traversal
        if (!filePath.startsWith(PUBLIC_DIR)) {
          return new Response("Forbidden", { status: 403 });
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(PUBLIC_DIR, "index.html");
        }

        const file = Bun.file(filePath);
        return new Response(file);
      } catch (e) {
        return new Response("Not Found", { status: 404 });
      }
    },
  });

  logger.info(`[Server] Telegram Mini App HTTP server running at http://localhost:${port}`);
  return serverInstance;
}

export function stopServer(): void {
  if (serverInstance) {
    try {
      serverInstance.stop();
      logger.info("[Server] HTTP server stopped.");
    } catch (e) {
      logger.error("[Server] Error stopping HTTP server:", e);
    }
    serverInstance = null;
  }
}
