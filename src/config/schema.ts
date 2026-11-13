export type LogLevel = "debug" | "info" | "warn" | "error";

export interface FieldMeta<T> {
	/** Key used in config.json. */
	json: string;
	/** Reads a value from config.json. undefined means missing or invalid. */
	coerce: (raw: unknown) => T | undefined;
	/** Accepted by the owner settings update API. */
	updatable?: boolean;
	/** Included in the owner settings snapshot. */
	exposed?: boolean;
	/** Startup validation. Return an error message to abort. */
	validate?: (value: T) => string | undefined;
}

interface StringFieldOptions {
	json: string;
	updatable?: boolean;
	exposed?: boolean;
}

function stringField(options: StringFieldOptions): FieldMeta<string> {
	const read = (raw: unknown): string | undefined =>
		typeof raw === "string" && raw.trim() ? raw.trim() : undefined;

	return {
		json: options.json,
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: read,
	};
}

function stringListField(options: { json: string }): FieldMeta<string[]> {
	return {
		json: options.json,
		coerce: (raw) =>
			Array.isArray(raw)
				? raw
						.map((value) => String(value).trim())
						.filter((value) => value.length > 0)
				: undefined,
	};
}

interface NumberFieldOptions {
	json: string;
	min?: number;
	max?: number;
	integer?: boolean;
	updatable?: boolean;
	exposed?: boolean;
}

function numberField(options: NumberFieldOptions): FieldMeta<number> {
	const parse = (raw: unknown): number | undefined =>
		typeof raw === "number" && !Number.isNaN(raw) ? raw : undefined;
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
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: parse,
		validate,
	};
}

interface BooleanFieldOptions {
	json: string;
	updatable?: boolean;
	exposed?: boolean;
}

function booleanField(options: BooleanFieldOptions): FieldMeta<boolean> {
	return {
		json: options.json,
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: (raw) => (typeof raw === "boolean" ? raw : undefined),
	};
}

interface EnumFieldOptions<T extends string> {
	json: string;
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
		updatable: options.updatable,
		exposed: options.exposed,
		coerce: parse,
	};
}

export const configSchema = {
	TELEGRAM_BOT_TOKEN: stringField({ json: "telegram_bot_token" }),
	OPENAI_API_KEY: stringField({
		json: "openai_api_key",
		updatable: true,
	}),
	OPENAI_BASE_URL: stringField({
		json: "openai_base_url",
		updatable: true,
		exposed: true,
	}),
	OPENAI_MODEL: stringField({
		json: "openai_model",
		updatable: true,
		exposed: true,
	}),
	OPENAI_EMBEDDING_MODEL: stringField({
		json: "openai_embedding_model",
		updatable: true,
		exposed: true,
	}),
	OPENAI_EMBEDDING_BASE_URL: stringField({
		json: "openai_embedding_base_url",
		updatable: true,
		exposed: true,
	}),
	OPENAI_EMBEDDING_API_KEY: stringField({
		json: "openai_embedding_api_key",
		updatable: true,
	}),
	OPENAI_TRANSCRIBE_MODEL: stringField({
		json: "openai_transcribe_model",
	}),
	CHAT_HISTORY_LIMIT: numberField({
		json: "chat_history_limit",
		min: 1,
		max: 100,
		integer: true,
		updatable: true,
		exposed: true,
	}),
	IMAGE_HISTORY_LIMIT: numberField({
		json: "image_history_limit",
		min: 0,
		integer: true,
	}),
	DEFAULT_REPLY_PROBABILITY: numberField({
		json: "default_reply_probability",
		min: 0,
		max: 1,
		updatable: true,
		exposed: true,
	}),
	ENABLE_SPONTANEOUS_REPLIES: booleanField({
		json: "enable_spontaneous_replies",
		updatable: true,
		exposed: true,
	}),
	DB_PATH: stringField({ json: "db_path" }),
	BOT_OWNER_ID: numberField({
		json: "bot_owner_id",
		min: 1,
		integer: true,
	}),
	ALLOWED_CHAT_IDS: stringListField({ json: "allowed_chat_ids" }),
	ENABLE_CODE_EXECUTION: booleanField({
		json: "enable_code_execution",
		updatable: true,
		exposed: true,
	}),
	SANDBOX_URL: stringField({
		json: "sandbox_url",
		updatable: true,
	}),
	SANDBOX_TIMEOUT_MS: numberField({
		json: "sandbox_timeout_ms",
		min: 1000,
		max: 300000,
		integer: true,
		updatable: true,
	}),
	MAX_AGENT_STEPS: numberField({
		json: "max_agent_steps",
		min: 1,
		max: 100,
		integer: true,
		updatable: true,
		exposed: true,
	}),
	MAX_IDENTICAL_TOOL_CALLS: numberField({
		json: "max_identical_tool_calls",
		min: 1,
		integer: true,
	}),
	MAX_TOOL_FAILURES_PER_TOOL: numberField({
		json: "max_tool_failures_per_tool",
		min: 1,
		integer: true,
	}),
	AGENT_CONTEXT_MAX_CHARS: numberField({
		json: "agent_context_max_chars",
		min: 1000,
		integer: true,
	}),
	ENABLE_FETCH_URL: booleanField({
		json: "enable_fetch_url",
		updatable: true,
		exposed: true,
	}),
	AGENT_TIMEOUT_MS: numberField({
		json: "agent_timeout_ms",
		min: 1000,
		integer: true,
	}),
	RATE_LIMIT_MESSAGES_PER_MINUTE: numberField({
		json: "rate_limit_messages_per_minute",
		min: 1,
		integer: true,
	}),
	RATE_LIMIT_GENERATIONS_PER_MINUTE: numberField({
		json: "rate_limit_generations_per_minute",
		min: 1,
		integer: true,
	}),
	RATE_LIMIT_API_PER_MINUTE: numberField({
		json: "rate_limit_api_per_minute",
		min: 1,
		integer: true,
	}),
	INIT_DATA_MAX_AGE_SECONDS: numberField({
		json: "init_data_max_age_seconds",
		min: 1,
		integer: true,
	}),
	LOG_LEVEL: enumField({
		json: "log_level",
		values: ["debug", "info", "warn", "error"] as const,
		updatable: true,
		exposed: true,
	}),
	LOG_DIR: stringField({ json: "log_dir" }),
	LOG_MAX_SIZE_MB: numberField({
		json: "log_max_size_mb",
		min: 1,
		integer: true,
	}),
	WEB_PORT: numberField({
		json: "web_port",
		min: 1,
		max: 65535,
		integer: true,
	}),
	WEB_APP_URL: stringField({ json: "web_app_url" }),
};

type FieldValue<F> = F extends FieldMeta<infer T> ? T : never;

export type Config = {
	[K in keyof typeof configSchema]: FieldValue<(typeof configSchema)[K]>;
};
