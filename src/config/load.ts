import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { type Config, configSchema, type FieldMeta } from "./schema";

const CONFIG_FILE_PATH = "config.json";

export type ConfigJson = Record<string, unknown> & {
	messages?: Partial<Record<string, string>>;
};

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

function readEnv(
	field: FieldMeta<unknown>,
	env: NodeJS.ProcessEnv,
): string | undefined {
	const keys =
		typeof field.env === "string"
			? [field.env]
			: Array.isArray(field.env)
				? field.env
				: [];

	for (const key of keys) {
		const value = env[key];
		if (value !== undefined) return value;
	}
	return undefined;
}

function resolveField<T>(
	field: FieldMeta<T>,
	raw: unknown,
	env: NodeJS.ProcessEnv,
): T {
	const fromConfig = field.coerce(raw);
	if (fromConfig !== undefined) return fromConfig;

	const envRaw = readEnv(field as FieldMeta<unknown>, env);
	if (envRaw !== undefined) {
		const fromEnv = field.parseEnv(envRaw);
		if (fromEnv !== undefined) return fromEnv;
	}

	return field.default;
}

export function resolveConfig(
	raw: ConfigJson,
	env: NodeJS.ProcessEnv = process.env,
): Config {
	const resolved: Record<string, unknown> = {};

	for (const key of Object.keys(configSchema) as Array<
		keyof typeof configSchema
	>) {
		const field = configSchema[key] as FieldMeta<unknown>;
		resolved[key] = resolveField(field, raw[field.json], env);
	}

	return resolved as Config;
}

export interface ConfigValidation {
	fatal: string[];
	warnings: string[];
}

export function validateConfig(config: Config): ConfigValidation {
	const fatal: string[] = [];
	const warnings: string[] = [];

	for (const key of Object.keys(configSchema) as Array<
		keyof typeof configSchema
	>) {
		const field = configSchema[key] as FieldMeta<unknown>;
		const value = config[key];

		if (
			field.required &&
			(value === undefined ||
				value === null ||
				(typeof value === "string" && !value.trim()))
		) {
			fatal.push(String(key));
			continue;
		}

		const warning = field.validate?.(value);
		if (warning) warnings.push(`${String(key)} ${warning}`);
	}

	return { fatal, warnings };
}

export function persistConfig(raw: ConfigJson, path = CONFIG_FILE_PATH): void {
	try {
		writeFileSync(path, JSON.stringify(raw, null, 2), "utf-8");
	} catch (error) {
		console.error(`[Config] Error writing ${path}:`, error);
	}
}
