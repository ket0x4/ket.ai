import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface ConfigJson {
	telegram_bot_token?: string;
	llm_provider?: "gemini" | "openai";
	gemini_api_key?: string;
	gemini_model?: string;
	openai_api_key?: string;
	openai_base_url?: string;
	openai_model?: string;
	chat_history_limit?: number;
	image_history_limit?: number;
	default_reply_probability?: number;
	enable_spontaneous_replies?: boolean;
	db_path?: string;
	bot_owner_id?: number;
	allowed_chat_ids?: (number | string)[];
	enable_web_search?: boolean;
	enable_code_execution?: boolean;
	sandbox_url?: string;
	sandbox_timeout_ms?: number;
	max_agent_steps?: number;
	max_tool_output_tokens?: number;
	enable_agent_thinking?: boolean;
	max_identical_tool_calls?: number;
	max_tool_failures_per_tool?: number;
	agent_context_max_chars?: number;
	enable_fetch_url?: boolean;
	gemini_min_request_interval_ms?: number;
	agent_timeout_ms?: number;
	rate_limit_messages_per_minute?: number;
	rate_limit_generations_per_minute?: number;
	rate_limit_api_per_minute?: number;
	init_data_max_age_seconds?: number;
	log_level?: string;

	log_dir?: string;
	log_max_size_mb?: number;
	web_port?: number;
	web_app_url?: string;
	messages?: Partial<Record<string, string>>;
}

let configJson: ConfigJson = {};
const CONFIG_FILE_PATH = "config.json";

if (existsSync(CONFIG_FILE_PATH)) {
	try {
		configJson = JSON.parse(readFileSync(CONFIG_FILE_PATH, "utf-8"));
	} catch (e) {
		console.error("Error reading or parsing config.json:", e);
	}
}

const env = process.env;

function str(val: string | undefined, envKey: string, fallback = ""): string {
	return val || env[envKey] || fallback;
}

function num(
	val: number | undefined,
	envKey: string | undefined,
	fallback: number,
): number {
	if (typeof val === "number" && !Number.isNaN(val)) return val;
	const raw = envKey ? env[envKey] : undefined;
	if (raw !== undefined && raw !== "") {
		const parsed = Number(raw);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return fallback;
}

function bool(
	val: boolean | undefined,
	envKey: string,
	fallback = true,
): boolean {
	if (typeof val === "boolean") return val;
	if (env[envKey] !== undefined) return env[envKey] !== "false";
	return fallback;
}

const DEFAULT_MESSAGES = {
	unauthorized_group_reply:
		"I don't have permission to talk in this group, I'm out! Contact my owner to add me.",
	private_chat_unauthorized:
		"Hey I only chat in groups approved by my owner. You can contact my owner to add me to your own group.",
	gemini_empty_reply_fallback: "I didn't know what to say.",
	gemini_error_reply_fallback: "My mind went blank, let's talk later.",
	gemini_empty_image_fallback:
		"Nice picture, but I didn't know what to say about it.",
	gemini_error_image_fallback:
		"Couldn't check the photo, must have gotten something in my eye.",
	image_download_failed: "Couldn't download the photo, Telegram blocked it.",
	image_processing_failed:
		"Got confused while looking at the photo, try again later.",
	not_authorized_command: "Only group admins or my owner can use this command!",
	tool_status_web_search: "Spawning subagent...",
	tool_status_code_execution: "⚡ Executing code in sandbox...",
};

function resolveMessages(
	overrides?: Partial<Record<string, string>>,
): typeof DEFAULT_MESSAGES {
	const resolved = { ...DEFAULT_MESSAGES };
	if (!overrides) return resolved;
	for (const key of Object.keys(DEFAULT_MESSAGES) as Array<
		keyof typeof DEFAULT_MESSAGES
	>) {
		if (overrides[key]) resolved[key] = overrides[key] as string;
	}
	return resolved;
}

export const CONFIG = {
	TELEGRAM_BOT_TOKEN: str(configJson.telegram_bot_token, "TELEGRAM_BOT_TOKEN"),
	LLM_PROVIDER: str(
		configJson.llm_provider,
		"LLM_PROVIDER",
		"gemini",
	).toLowerCase() as "gemini" | "openai",
	GEMINI_API_KEY: str(configJson.gemini_api_key, "GEMINI_API_KEY"),
	GEMINI_MODEL: str(
		configJson.gemini_model,
		"GEMINI_MODEL",
		"gemini-3.8-flash",
	),
	OPENAI_API_KEY: str(configJson.openai_api_key, "OPENAI_API_KEY"),
	OPENAI_BASE_URL: str(
		configJson.openai_base_url,
		"OPENAI_BASE_URL",
		"http://localhost:8080/v1",
	),
	OPENAI_MODEL: str(configJson.openai_model, "OPENAI_MODEL", "default"),
	CHAT_HISTORY_LIMIT: num(
		configJson.chat_history_limit,
		"CHAT_HISTORY_LIMIT",
		20,
	),
	IMAGE_HISTORY_LIMIT: num(
		configJson.image_history_limit,
		"IMAGE_HISTORY_LIMIT",
		5,
	),
	DEFAULT_REPLY_PROBABILITY: num(
		configJson.default_reply_probability,
		"DEFAULT_REPLY_PROBABILITY",
		0.05,
	),
	ENABLE_SPONTANEOUS_REPLIES: bool(
		configJson.enable_spontaneous_replies,
		"ENABLE_SPONTANEOUS_REPLIES",
		true,
	),
	DB_PATH: str(configJson.db_path, "DB_PATH", "bot.db"),
	BOT_OWNER_ID:
		configJson.bot_owner_id ||
		(env.BOT_OWNER_ID ? Number.parseInt(env.BOT_OWNER_ID, 10) : undefined),
	ALLOWED_CHAT_IDS: Array.isArray(configJson.allowed_chat_ids)
		? configJson.allowed_chat_ids.map((id) => id.toString())
		: env.ALLOWED_CHAT_IDS
			? env.ALLOWED_CHAT_IDS.split(",").map((id) => id.trim())
			: [],
	ENABLE_WEB_SEARCH: bool(configJson.enable_web_search, "ENABLE_WEB_SEARCH"),
	ENABLE_CODE_EXECUTION: bool(
		configJson.enable_code_execution,
		"ENABLE_CODE_EXECUTION",
	),
	SANDBOX_URL:
		env.SANDBOX_URL || configJson.sandbox_url || "http://localhost:8080",
	SANDBOX_TIMEOUT_MS: num(
		configJson.sandbox_timeout_ms,
		"SANDBOX_TIMEOUT_MS",
		45000,
	),
	MAX_AGENT_STEPS: num(configJson.max_agent_steps, "MAX_AGENT_STEPS", 50),
	MAX_TOOL_OUTPUT_TOKENS: num(
		configJson.max_tool_output_tokens,
		"MAX_TOOL_OUTPUT_TOKENS",
		8192,
	),
	ENABLE_AGENT_THINKING: bool(
		configJson.enable_agent_thinking,
		"ENABLE_AGENT_THINKING",
	),
	MAX_IDENTICAL_TOOL_CALLS: num(
		configJson.max_identical_tool_calls,
		"MAX_IDENTICAL_TOOL_CALLS",
		1,
	),
	MAX_TOOL_FAILURES_PER_TOOL: num(
		configJson.max_tool_failures_per_tool,
		"MAX_TOOL_FAILURES_PER_TOOL",
		3,
	),
	AGENT_CONTEXT_MAX_CHARS: num(
		configJson.agent_context_max_chars,
		"AGENT_CONTEXT_MAX_CHARS",
		28000,
	),
	ENABLE_FETCH_URL: bool(configJson.enable_fetch_url, "ENABLE_FETCH_URL"),
	GEMINI_MIN_REQUEST_INTERVAL_MS: num(
		configJson.gemini_min_request_interval_ms,
		"GEMINI_MIN_REQUEST_INTERVAL_MS",
		3500,
	),
	AGENT_TIMEOUT_MS: num(
		configJson.agent_timeout_ms,
		"AGENT_TIMEOUT_MS",
		180000,
	),
	RATE_LIMIT_MESSAGES_PER_MINUTE: num(
		configJson.rate_limit_messages_per_minute,
		"RATE_LIMIT_MESSAGES_PER_MINUTE",
		20,
	),
	RATE_LIMIT_GENERATIONS_PER_MINUTE: num(
		configJson.rate_limit_generations_per_minute,
		"RATE_LIMIT_GENERATIONS_PER_MINUTE",
		6,
	),
	RATE_LIMIT_API_PER_MINUTE: num(
		configJson.rate_limit_api_per_minute,
		"RATE_LIMIT_API_PER_MINUTE",
		120,
	),
	INIT_DATA_MAX_AGE_SECONDS: num(
		configJson.init_data_max_age_seconds,
		"INIT_DATA_MAX_AGE_SECONDS",
		86400,
	),
	LOG_LEVEL: str(configJson.log_level, "LOG_LEVEL", "info").toLowerCase() as
		| "debug"
		| "info"
		| "warn"
		| "error",
	LOG_DIR: str(configJson.log_dir, "LOG_DIR", "logs"),
	LOG_MAX_SIZE_MB: num(configJson.log_max_size_mb, "LOG_MAX_SIZE_MB", 5),
	WEB_PORT: num(configJson.web_port, env.PORT ? "PORT" : "WEB_PORT", 3000),
	WEB_APP_URL: str(configJson.web_app_url, "WEB_APP_URL"),
	MESSAGES: resolveMessages(configJson.messages),
};

// Validate critical config — fail fast if essentials are missing
const missingKeys: string[] = [];
if (!CONFIG.TELEGRAM_BOT_TOKEN) missingKeys.push("TELEGRAM_BOT_TOKEN");
if (!CONFIG.GEMINI_API_KEY) missingKeys.push("GEMINI_API_KEY");

const isTestEnv = env.NODE_ENV === "test" || env.BUN_ENV === "test";

if (missingKeys.length > 0 && !isTestEnv) {
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

export interface BotSettingsUpdate {
	llm_provider?: "gemini" | "openai";
	gemini_model?: string;
	openai_model?: string;
	openai_base_url?: string;
	openai_api_key?: string;
	default_reply_probability?: number;
	enable_spontaneous_replies?: boolean;
	chat_history_limit?: number;
	enable_web_search?: boolean;
	enable_code_execution?: boolean;
	sandbox_url?: string;
	sandbox_timeout_ms?: number;
	max_agent_steps?: number;
	gemini_min_request_interval_ms?: number;
	log_level?: "debug" | "info" | "warn" | "error";
}

const SETTINGS_KEY_MAP: Record<keyof BotSettingsUpdate, keyof typeof CONFIG> = {
	llm_provider: "LLM_PROVIDER",
	gemini_model: "GEMINI_MODEL",
	openai_model: "OPENAI_MODEL",
	openai_base_url: "OPENAI_BASE_URL",
	openai_api_key: "OPENAI_API_KEY",
	default_reply_probability: "DEFAULT_REPLY_PROBABILITY",
	enable_spontaneous_replies: "ENABLE_SPONTANEOUS_REPLIES",
	chat_history_limit: "CHAT_HISTORY_LIMIT",
	enable_web_search: "ENABLE_WEB_SEARCH",
	enable_code_execution: "ENABLE_CODE_EXECUTION",
	sandbox_url: "SANDBOX_URL",
	sandbox_timeout_ms: "SANDBOX_TIMEOUT_MS",
	max_agent_steps: "MAX_AGENT_STEPS",
	gemini_min_request_interval_ms: "GEMINI_MIN_REQUEST_INTERVAL_MS",
	log_level: "LOG_LEVEL",
};

/**
 * Updates bot configuration settings and persists changes to config.json.
 */
export function updateBotSettings(settings: BotSettingsUpdate): void {
	const configRecord = CONFIG as Record<string, unknown>;
	const jsonRecord = configJson as Record<string, unknown>;

	for (const [jsonKey, configKey] of Object.entries(SETTINGS_KEY_MAP) as Array<
		[keyof BotSettingsUpdate, keyof typeof CONFIG]
	>) {
		const value = settings[jsonKey];
		if (value !== undefined) {
			configRecord[configKey] = value;
			jsonRecord[jsonKey] = value;
		}
	}

	try {
		writeFileSync(
			CONFIG_FILE_PATH,
			JSON.stringify(configJson, null, 2),
			"utf-8",
		);
	} catch (e) {
		console.error("[Config] Error writing config.json:", e);
	}
}
