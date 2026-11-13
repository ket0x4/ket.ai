import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { type Config, configSchema, type FieldMeta } from "./schema";

const CONFIG_FILE_PATH = "config.json";

type ConfigJson = Record<string, unknown>;

export function readConfigJson(path = CONFIG_FILE_PATH): ConfigJson {
	if (!existsSync(path)) return {};

	try {
		const parsed = JSON.parse(readFileSync(path, "utf-8"));
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as ConfigJson)
			: {};
	} catch (error) {
		console.error(`Error reading or parsing ${path}:`, error);
		return {};
	}
}

interface LoadedConfig {
	config: Config;
	errors: string[];
}

/**
 * Resolves every required config value from the raw config.json object.
 * Missing or invalid values are collected so startup can report them together.
 */
export function loadConfig(raw: ConfigJson): LoadedConfig {
	const values: Record<string, unknown> = {};
	const errors: string[] = [];

	for (const key of Object.keys(configSchema) as Array<
		keyof typeof configSchema
	>) {
		const field = configSchema[key] as FieldMeta<unknown>;
		const value = field.coerce(raw[field.json]);

		if (value === undefined) {
			errors.push(`${field.json}: missing or invalid`);
			continue;
		}

		values[key] = value;
		const validationError = field.validate?.(value);
		if (validationError) {
			errors.push(`${field.json}: ${validationError}`);
		}
	}

	return { config: values as Config, errors };
}

export function persistConfig(raw: ConfigJson, path = CONFIG_FILE_PATH): void {
	try {
		writeFileSync(path, JSON.stringify(raw, null, 2), "utf-8");
	} catch (error) {
		console.error(`[Config] Error writing ${path}:`, error);
	}
}
