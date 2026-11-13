export type LogLevel = "debug" | "info" | "warn" | "error";

export interface FieldMeta<T> {
	/** Key used in config.json. */
	json: string;
	/** Environment variable(s); the first defined one wins. */
	env?: string | readonly string[];
	default: T;
	/** Reads a value from config.json. Returning undefined falls through to env. */
	coerce: (raw: unknown) => T | undefined;
	/** Parses an environment string. */
	parseEnv: (raw: string) => T | undefined;
	/** Sanitizes a runtime settings update. */
	sanitize?: (raw: unknown) => T | undefined;
	/** Accepted by the owner settings update API. */
	updatable?: boolean;
	/** Included in the owner settings snapshot. */
	exposed?: boolean;
	/** Missing values are fatal outside tests. */
	required?: boolean;
	/** Non-fatal validation warning. */
	validate?: (value: T) => string | undefined;
}

interface StringFieldOptions {
	json: string;
	env?: string | readonly string[];
	default?: string;
	/** Allows runtime updates to clear the value with an empty string. */
	allowEmpty?: boolean;
	required?: boolean;
	updatable?: boolean;
	exposed?: boolean;
	validate?: (value: string) => string | undefined;
}

function stringField(options: StringFieldOptions): FieldMeta<string> {
	const allowEmpty = options.allowEmpty ?? false;
	const read = (raw: string): string | undefined => raw.trim() || undefined;
	const sanitize = (raw: string): string | undefined => {
		const trimmed = raw.trim();
		return trimmed || (allowEmpty ? "" : undefined);
	};

	return {
		json: options.json,
		env: options.env,
		default: options.default ?? "",
		required: options.required,
		updatable: options.updatable,
		exposed: options.exposed,
		validate: options.validate,
		coerce: (raw) => (typeof raw === "string" ? read(raw) : undefined),
		parseEnv: read,
		sanitize: options.updatable
			? (raw) => (typeof raw === "string" ? sanitize(raw) : undefined)
			: undefined,
	};
}

interface StringListFieldOptions {
	json: string;
	env?: string | readonly string[];
	default?: string[];
	separator?: string;
}

function stringListField(options: StringListFieldOptions): FieldMeta<string[]> {
	const normalize = (values: readonly unknown[]): string[] =>
		values
			.map((value) => String(value).trim())
			.filter((value) => value.length > 0);

	return {
		json: options.json,
		env: options.env,
		default: options.default ?? [],
		coerce: (raw) => (Array.isArray(raw) ? normalize(raw) : undefined),
		parseEnv: (raw) => normalize(raw.split(options.separator ?? ",")),
	};
}

interface NumberFieldOptions {
	json: string;
	env?: string | readonly string[];
	default: number;
	min?: number;
	max?: number;
	integer?: boolean;
	updatable?: boolean;
	exposed?: boolean;
}

function numberField(options: NumberFieldOptions): FieldMeta<number> {
	const parse = (raw: unknown): number | undefined =>
		typeof raw === "number" && !Number.isNaN(raw) ? raw : undefined;
	const parseEnv = (raw: string): number | undefined => {
		if (!raw.trim()) return undefined;
		const parsed = Number(raw);
		return Number.isNaN(parsed) ? undefined : parsed;
	};
	const clamp = (value: number): number => {
		let next = options.integer ? Math.round(value) : value;
		if (options.min !== undefined) next = Math.max(options.min, next);
		if (options.max !== undefined) next = Math.min(options.max, next);
		return next;
	};
	const validate = (value: number): string | undefined => {
		if (options.min !== undefined && value < options.min) {
			return `must be >= ${options.min}`;
		}
		if (options.max !== undefined && value > options.max) {
			return `must be <= ${options.max}`;
		}
		if (options.integer && !Number.isInteger(value)) {
			return "must be an integer";
		}
		return undefined;
	};

	return {
		json: options.json,
		env: options.env,
		default: options.default,
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: parse,
		parseEnv,
		sanitize: options.updatable
			? (raw) => {
					const parsed = parse(raw);
					return parsed === undefined ? undefined : clamp(parsed);
				}
			: undefined,
		validate,
	};
}

interface OptionalNumberFieldOptions {
	json: string;
	env?: string | readonly string[];
	min?: number;
	integer?: boolean;
}

function optionalNumberField(
	options: OptionalNumberFieldOptions,
): FieldMeta<number | undefined> {
	const normalize = (value: number): number | undefined => {
		const next = options.integer ? Math.round(value) : value;
		return options.min !== undefined && next < options.min ? undefined : next;
	};

	return {
		json: options.json,
		env: options.env,
		default: undefined,
		coerce: (raw) =>
			typeof raw === "number" && !Number.isNaN(raw)
				? normalize(raw)
				: undefined,
		parseEnv: (raw) => {
			const parsed = Number.parseInt(raw, 10);
			return Number.isNaN(parsed) ? undefined : normalize(parsed);
		},
	};
}

interface BooleanFieldOptions {
	json: string;
	env?: string | readonly string[];
	default: boolean;
	updatable?: boolean;
	exposed?: boolean;
}

function booleanField(options: BooleanFieldOptions): FieldMeta<boolean> {
	const parseEnv = (raw: string): boolean | undefined => {
		const value = raw.trim().toLowerCase();
		if (["true", "1", "yes", "on"].includes(value)) return true;
		if (["false", "0", "no", "off"].includes(value)) return false;
		return undefined;
	};

	return {
		json: options.json,
		env: options.env,
		default: options.default,
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: (raw) => (typeof raw === "boolean" ? raw : undefined),
		parseEnv,
		sanitize: options.updatable
			? (raw) => (typeof raw === "boolean" ? raw : undefined)
			: undefined,
	};
}

interface EnumFieldOptions<T extends string> {
	json: string;
	env?: string | readonly string[];
	default: T;
	values: readonly T[];
	updatable?: boolean;
	exposed?: boolean;
}

function enumField<T extends string>(
	options: EnumFieldOptions<T>,
): FieldMeta<T> {
	const parse = (raw: unknown): T | undefined => {
		if (typeof raw !== "string") return undefined;
		const normalized = raw.trim().toLowerCase();
		return options.values.includes(normalized as T)
			? (normalized as T)
			: undefined;
	};

	return {
		json: options.json,
		env: options.env,
		default: options.default,
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: parse,
		parseEnv: parse,
		sanitize: options.updatable ? parse : undefined,
	};
}

export const configSchema = {
	TELEGRAM_BOT_TOKEN: stringField({
		json: "telegram_bot_token",
		env: "TELEGRAM_BOT_TOKEN",
		required: true,
	}),
	OPENAI_API_KEY: stringField({
		json: "openai_api_key",
		env: "OPENAI_API_KEY",
		updatable: true,
	}),
	OPENAI_BASE_URL: stringField({
		json: "openai_base_url",
		env: "OPENAI_BASE_URL",
		default: "http://localhost:8080/v1",
		updatable: true,
		exposed: true,
	}),
	OPENAI_MODEL: stringField({
		json: "openai_model",
		env: "OPENAI_MODEL",
		default: "default",
		updatable: true,
		exposed: true,
	}),
	OPENAI_EMBEDDING_MODEL: stringField({
		json: "openai_embedding_model",
		env: "OPENAI_EMBEDDING_MODEL",
		default: "text-embedding-3-small",
		updatable: true,
		exposed: true,
	}),
	OPENAI_EMBEDDING_BASE_URL: stringField({
		json: "openai_embedding_base_url",
		env: "OPENAI_EMBEDDING_BASE_URL",
		allowEmpty: true,
		updatable: true,
		exposed: true,
	}),
	OPENAI_EMBEDDING_API_KEY: stringField({
		json: "openai_embedding_api_key",
		env: "OPENAI_EMBEDDING_API_KEY",
		allowEmpty: true,
		updatable: true,
	}),
	OPENAI_TRANSCRIBE_MODEL: stringField({
		json: "openai_transcribe_model",
		env: "OPENAI_TRANSCRIBE_MODEL",
		default: "whisper-1",
	}),
	CHAT_HISTORY_LIMIT: numberField({
		json: "chat_history_limit",
		env: "CHAT_HISTORY_LIMIT",
		default: 20,
		min: 1,
		max: 100,
		integer: true,
		updatable: true,
		exposed: true,
	}),
	IMAGE_HISTORY_LIMIT: numberField({
		json: "image_history_limit",
		env: "IMAGE_HISTORY_LIMIT",
		default: 5,
		min: 0,
		integer: true,
	}),
	DEFAULT_REPLY_PROBABILITY: numberField({
		json: "default_reply_probability",
		env: "DEFAULT_REPLY_PROBABILITY",
		default: 0.05,
		min: 0,
		max: 1,
		updatable: true,
		exposed: true,
	}),
	ENABLE_SPONTANEOUS_REPLIES: booleanField({
		json: "enable_spontaneous_replies",
		env: "ENABLE_SPONTANEOUS_REPLIES",
		default: true,
		updatable: true,
		exposed: true,
	}),
	DB_PATH: stringField({
		json: "db_path",
		env: "DB_PATH",
		default: "bot.db",
	}),
	BOT_OWNER_ID: optionalNumberField({
		json: "bot_owner_id",
		env: "BOT_OWNER_ID",
		min: 1,
		integer: true,
	}),
	ALLOWED_CHAT_IDS: stringListField({
		json: "allowed_chat_ids",
		env: "ALLOWED_CHAT_IDS",
	}),
	ENABLE_CODE_EXECUTION: booleanField({
		json: "enable_code_execution",
		env: "ENABLE_CODE_EXECUTION",
		default: true,
		updatable: true,
		exposed: true,
	}),
	SANDBOX_URL: stringField({
		json: "sandbox_url",
		env: "SANDBOX_URL",
		default: "http://localhost:8080",
		updatable: true,
	}),
	SANDBOX_TIMEOUT_MS: numberField({
		json: "sandbox_timeout_ms",
		env: "SANDBOX_TIMEOUT_MS",
		default: 45000,
		min: 1000,
		max: 300000,
		integer: true,
		updatable: true,
	}),
	MAX_AGENT_STEPS: numberField({
		json: "max_agent_steps",
		env: "MAX_AGENT_STEPS",
		default: 50,
		min: 1,
		max: 100,
		integer: true,
		updatable: true,
		exposed: true,
	}),
	MAX_IDENTICAL_TOOL_CALLS: numberField({
		json: "max_identical_tool_calls",
		env: "MAX_IDENTICAL_TOOL_CALLS",
		default: 1,
		min: 1,
		integer: true,
	}),
	MAX_TOOL_FAILURES_PER_TOOL: numberField({
		json: "max_tool_failures_per_tool",
		env: "MAX_TOOL_FAILURES_PER_TOOL",
		default: 3,
		min: 1,
		integer: true,
	}),
	AGENT_CONTEXT_MAX_CHARS: numberField({
		json: "agent_context_max_chars",
		env: "AGENT_CONTEXT_MAX_CHARS",
		default: 28000,
		min: 1000,
		integer: true,
	}),
	ENABLE_FETCH_URL: booleanField({
		json: "enable_fetch_url",
		env: "ENABLE_FETCH_URL",
		default: true,
		updatable: true,
		exposed: true,
	}),
	AGENT_TIMEOUT_MS: numberField({
		json: "agent_timeout_ms",
		env: "AGENT_TIMEOUT_MS",
		default: 180000,
		min: 1000,
		integer: true,
	}),
	RATE_LIMIT_MESSAGES_PER_MINUTE: numberField({
		json: "rate_limit_messages_per_minute",
		env: "RATE_LIMIT_MESSAGES_PER_MINUTE",
		default: 20,
		min: 1,
		integer: true,
	}),
	RATE_LIMIT_GENERATIONS_PER_MINUTE: numberField({
		json: "rate_limit_generations_per_minute",
		env: "RATE_LIMIT_GENERATIONS_PER_MINUTE",
		default: 6,
		min: 1,
		integer: true,
	}),
	RATE_LIMIT_API_PER_MINUTE: numberField({
		json: "rate_limit_api_per_minute",
		env: "RATE_LIMIT_API_PER_MINUTE",
		default: 120,
		min: 1,
		integer: true,
	}),
	INIT_DATA_MAX_AGE_SECONDS: numberField({
		json: "init_data_max_age_seconds",
		env: "INIT_DATA_MAX_AGE_SECONDS",
		default: 86400,
		min: 1,
		integer: true,
	}),
	LOG_LEVEL: enumField({
		json: "log_level",
		env: "LOG_LEVEL",
		default: "info",
		values: ["debug", "info", "warn", "error"] as const,
		updatable: true,
		exposed: true,
	}),
	LOG_DIR: stringField({
		json: "log_dir",
		env: "LOG_DIR",
		default: "logs",
	}),
	LOG_MAX_SIZE_MB: numberField({
		json: "log_max_size_mb",
		env: "LOG_MAX_SIZE_MB",
		default: 5,
		min: 1,
		integer: true,
	}),
	WEB_PORT: numberField({
		json: "web_port",
		env: ["PORT", "WEB_PORT"],
		default: 3000,
		min: 1,
		max: 65535,
		integer: true,
	}),
	WEB_APP_URL: stringField({
		json: "web_app_url",
		env: "WEB_APP_URL",
	}),
};

type FieldValue<F> = F extends FieldMeta<infer T> ? T : never;

export type Config = {
	[K in keyof typeof configSchema]: FieldValue<(typeof configSchema)[K]>;
};
