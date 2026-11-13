import {
	type Config,
	configSchema,
	type FieldMeta,
	type LogLevel,
} from "./schema";

export interface BotSettingsUpdate {
	openai_model?: string;
	openai_base_url?: string;
	openai_api_key?: string;
	openai_embedding_model?: string;
	openai_embedding_base_url?: string;
	openai_embedding_api_key?: string;
	default_reply_probability?: number;
	enable_spontaneous_replies?: boolean;
	chat_history_limit?: number;
	enable_code_execution?: boolean;
	enable_fetch_url?: boolean;
	sandbox_url?: string;
	sandbox_timeout_ms?: number;
	max_agent_steps?: number;
	log_level?: LogLevel;
}

export interface BotSettingsSnapshot {
	openai_model: string;
	openai_base_url: string;
	openai_embedding_model: string;
	openai_embedding_base_url: string;
	default_reply_probability: number;
	enable_spontaneous_replies: boolean;
	chat_history_limit: number;
	enable_code_execution: boolean;
	enable_fetch_url: boolean;
	max_agent_steps: number;
	log_level: LogLevel;
}

export function snapshotSettings(config: Config): BotSettingsSnapshot {
	const snapshot: Record<string, unknown> = {};

	for (const key of Object.keys(configSchema) as Array<
		keyof typeof configSchema
	>) {
		const field = configSchema[key] as FieldMeta<unknown>;
		if (!field.exposed) continue;
		snapshot[field.json] = config[key];
	}

	return snapshot as unknown as BotSettingsSnapshot;
}

export interface SettingsApplyResult {
	changed: boolean;
	errors: string[];
}

/**
 * Validates a settings patch and applies it to the in-memory config and raw
 * config record. Invalid values abort the whole patch.
 */
export function applySettings(
	config: Config,
	raw: Record<string, unknown>,
	update: BotSettingsUpdate,
): SettingsApplyResult {
	const pending: Array<{
		key: keyof typeof configSchema;
		json: string;
		value: unknown;
	}> = [];
	const errors: string[] = [];
	const updateRecord = update as Record<string, unknown>;

	for (const key of Object.keys(configSchema) as Array<
		keyof typeof configSchema
	>) {
		const field = configSchema[key] as FieldMeta<unknown>;
		if (!field.updatable) continue;
		if (!(field.json in updateRecord)) continue;

		const value = field.coerce(updateRecord[field.json]);
		if (value === undefined) {
			errors.push(`${field.json}: missing or invalid`);
			continue;
		}

		const validationError = field.validate?.(value);
		if (validationError) {
			errors.push(`${field.json}: ${validationError}`);
			continue;
		}

		pending.push({ key, json: field.json, value });
	}

	if (errors.length > 0) return { changed: false, errors };

	const configRecord = config as unknown as Record<string, unknown>;
	let changed = false;

	for (const item of pending) {
		if (configRecord[item.key] === item.value) continue;
		configRecord[item.key] = item.value;
		raw[item.json] = item.value;
		changed = true;
	}

	return { changed, errors };
}
