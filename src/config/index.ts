import { readFileSync, existsSync } from "fs";

interface ConfigJson {
  telegram_bot_token?: string;
  gemini_api_key?: string;
  gemini_model?: string;
  chat_history_limit?: number;
  image_history_limit?: number;
  default_reply_probability?: number;
  db_path?: string;
  bot_owner_id?: number;
  allowed_chat_ids?: (number | string)[];
  enable_web_search?: boolean;
  max_agent_steps?: number;
  log_level?: string;
  log_dir?: string;
  log_max_size_mb?: number;
  log_retention_days?: number;
  web_port?: number;
  web_app_url?: string;
  messages?: Partial<Record<string, string>>;
}

let configJson: ConfigJson = {};
const CONFIG_FILE_PATH = "config.json";

if (existsSync(CONFIG_FILE_PATH)) {
  try {
    const raw = readFileSync(CONFIG_FILE_PATH, "utf-8");
    configJson = JSON.parse(raw);
  } catch (e) {
    console.error("Error reading or parsing config.json:", e);
  }
}

export let CONFIG = {
  TELEGRAM_BOT_TOKEN:
    configJson.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || "",
  GEMINI_API_KEY: configJson.gemini_api_key || process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL:
    configJson.gemini_model ||
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash-lite",
  CHAT_HISTORY_LIMIT:
    typeof configJson.chat_history_limit === "number"
      ? configJson.chat_history_limit
      : 10,
  IMAGE_HISTORY_LIMIT:
    typeof configJson.image_history_limit === "number"
      ? configJson.image_history_limit
      : 5,
  DEFAULT_REPLY_PROBABILITY:
    typeof configJson.default_reply_probability === "number"
      ? configJson.default_reply_probability
      : 0.05,
  DB_PATH: configJson.db_path || process.env.DB_PATH || "bot.db",
  BOT_OWNER_ID:
    configJson.bot_owner_id ||
    (process.env.BOT_OWNER_ID
      ? parseInt(process.env.BOT_OWNER_ID, 10)
      : undefined),
  ALLOWED_CHAT_IDS: Array.isArray(configJson.allowed_chat_ids)
    ? configJson.allowed_chat_ids.map((id: number | string) => id.toString())
    : process.env.ALLOWED_CHAT_IDS
      ? process.env.ALLOWED_CHAT_IDS.split(",").map((id) => id.trim())
      : [],
  ENABLE_WEB_SEARCH:
    typeof configJson.enable_web_search === "boolean"
      ? configJson.enable_web_search
      : process.env.ENABLE_WEB_SEARCH !== "false",
  MAX_AGENT_STEPS:
    typeof configJson.max_agent_steps === "number"
      ? configJson.max_agent_steps
      : process.env.MAX_AGENT_STEPS
        ? parseInt(process.env.MAX_AGENT_STEPS, 10)
        : 3,
  LOG_LEVEL: (
    configJson.log_level ||
    process.env.LOG_LEVEL ||
    "info"
  ).toLowerCase() as "debug" | "info" | "warn" | "error",
  LOG_DIR: configJson.log_dir || process.env.LOG_DIR || "logs",
  LOG_MAX_SIZE_MB:
    typeof configJson.log_max_size_mb === "number"
      ? configJson.log_max_size_mb
      : process.env.LOG_MAX_SIZE_MB
        ? parseFloat(process.env.LOG_MAX_SIZE_MB)
        : 5,
  LOG_RETENTION_DAYS:
    typeof configJson.log_retention_days === "number"
      ? configJson.log_retention_days
      : process.env.LOG_RETENTION_DAYS
        ? parseInt(process.env.LOG_RETENTION_DAYS, 10)
        : 14,
  WEB_PORT:
    typeof configJson.web_port === "number"
      ? configJson.web_port
      : process.env.PORT
        ? parseInt(process.env.PORT, 10)
        : process.env.WEB_PORT
          ? parseInt(process.env.WEB_PORT, 10)
          : 3000,
  WEB_APP_URL:
    configJson.web_app_url || process.env.WEB_APP_URL || "",
  MESSAGES: {
    unauthorized_group_reply:
      configJson.messages?.unauthorized_group_reply ||
      "I don't have permission to talk in this group, I'm out! Contact my owner to add me.",
    private_chat_unauthorized:
      configJson.messages?.private_chat_unauthorized ||
      "Hey I only chat in groups approved by my owner. You can contact my owner to add me to your own group.",
    gemini_empty_reply_fallback:
      configJson.messages?.gemini_empty_reply_fallback ||
      "I didn't know what to say.",
    gemini_error_reply_fallback:
      configJson.messages?.gemini_error_reply_fallback ||
      "My mind went blank, let's talk later.",
    gemini_empty_image_fallback:
      configJson.messages?.gemini_empty_image_fallback ||
      "Nice picture, but I didn't know what to say about it.",
    gemini_error_image_fallback:
      configJson.messages?.gemini_error_image_fallback ||
      "Couldn't check the photo, must have gotten something in my eye.",
    image_download_failed:
      configJson.messages?.image_download_failed ||
      "Couldn't download the photo, Telegram blocked it.",
    image_processing_failed:
      configJson.messages?.image_processing_failed ||
      "Got confused while looking at the photo, try again later.",
    not_authorized_command:
      configJson.messages?.not_authorized_command ||
      "Only group admins or my owner can use this command!",
    tool_status_web_search:
      configJson.messages?.tool_status_web_search || "Spawning subagent...",
  },
};

// Validate critical config — fail fast if essentials are missing
const missingKeys: string[] = [];
if (!CONFIG.TELEGRAM_BOT_TOKEN) missingKeys.push("TELEGRAM_BOT_TOKEN");
if (!CONFIG.GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");

if (missingKeys.length > 0) {
  console.error(
    `FATAL: Missing required configuration: ${missingKeys.join(", ")}`,
  );
  console.error("Please set them in config.json or as environment variables.");
  process.exit(1);
}

if (CONFIG.CHAT_HISTORY_LIMIT < 1 || CONFIG.CHAT_HISTORY_LIMIT > 100) {
  console.warn("WARNING: CHAT_HISTORY_LIMIT should be between 1 and 100.");
}
if (
  CONFIG.DEFAULT_REPLY_PROBABILITY < 0 ||
  CONFIG.DEFAULT_REPLY_PROBABILITY > 1
) {
  console.warn("WARNING: DEFAULT_REPLY_PROBABILITY should be between 0 and 1.");
}

/**
 * Updates the active Gemini model at runtime.
 */
export function updateModel(modelName: string): void {
  CONFIG.GEMINI_MODEL = modelName;
  configJson.gemini_model = modelName;
}

/**
 * Updates bot configuration settings and persists changes to config.json.
 */
export function updateBotSettings(settings: {
  gemini_model?: string;
  default_reply_probability?: number;
  chat_history_limit?: number;
  enable_web_search?: boolean;
  max_agent_steps?: number;
  log_level?: "debug" | "info" | "warn" | "error";
}): void {
  const { writeFileSync } = require("fs");

  if (settings.gemini_model !== undefined) {
    CONFIG.GEMINI_MODEL = settings.gemini_model;
    configJson.gemini_model = settings.gemini_model;
  }
  if (settings.default_reply_probability !== undefined) {
    CONFIG.DEFAULT_REPLY_PROBABILITY = settings.default_reply_probability;
    configJson.default_reply_probability = settings.default_reply_probability;
  }
  if (settings.chat_history_limit !== undefined) {
    CONFIG.CHAT_HISTORY_LIMIT = settings.chat_history_limit;
    configJson.chat_history_limit = settings.chat_history_limit;
  }
  if (settings.enable_web_search !== undefined) {
    CONFIG.ENABLE_WEB_SEARCH = settings.enable_web_search;
    configJson.enable_web_search = settings.enable_web_search;
  }
  if (settings.max_agent_steps !== undefined) {
    CONFIG.MAX_AGENT_STEPS = settings.max_agent_steps;
    configJson.max_agent_steps = settings.max_agent_steps;
  }
  if (settings.log_level !== undefined) {
    CONFIG.LOG_LEVEL = settings.log_level;
    configJson.log_level = settings.log_level;
  }

  try {
    writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configJson, null, 2), "utf-8");
  } catch (e) {
    console.error("[Config] Error writing config.json:", e);
  }
}
