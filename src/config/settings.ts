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

/**
 * Applies a sanitized settings patch to the in-memory config and raw config
 * record. Returns true when at least one value changed.
 */
export function applySettings(
	config: Config,
	raw: Record<string, unknown>,
	update: BotSettingsUpdate,
): boolean {
	const configRecord = config as unknown as Record<string, unknown>;
	const updateRecord = update as Record<string, unknown>;
	let changed = false;

	for (const key of Object.keys(configSchema) as Array<
		keyof typeof configSchema
	>) {
		const field = configSchema[key] as FieldMeta<unknown>;
		if (!field.updatable || !field.sanitize) continue;
		if (!(field.json in updateRecord)) continue;

		const sanitized = field.sanitize(updateRecord[field.json]);
		if (sanitized === undefined || configRecord[key] === sanitized) {
			continue;
		}

		configRecord[key] = sanitized;
		raw[field.json] = sanitized;
		changed = true;
	}

	return changed;
}
