import { loadConfig, persistConfig, readConfigJson } from "./load";
import { MESSAGES, type Messages } from "./messages";
import type { Config } from "./schema";
import {
	applySettings,
	type BotSettingsSnapshot,
	type BotSettingsUpdate,
	snapshotSettings,
} from "./settings";

const rawConfig = readConfigJson();
const { config, errors } = loadConfig(rawConfig);

if (errors.length > 0) {
	console.error("FATAL: Invalid configuration. Fix config.json and restart:");
	for (const error of errors) {
		console.error(`  - ${error}`);
	}
	console.error("See config.example.json for the required values.");
	process.exit(1);
}

export const CONFIG: Config & { MESSAGES: Messages } = {
	...config,
	MESSAGES,
};

export type { BotSettingsUpdate };

export function getBotSettingsSnapshot(): BotSettingsSnapshot {
	return snapshotSettings(CONFIG);
}

export function updateBotSettings(settings: BotSettingsUpdate): string[] {
	const { changed, errors } = applySettings(CONFIG, rawConfig, settings);
	if (errors.length > 0) return errors;
	if (changed) persistConfig(rawConfig);
	return [];
}
