import { IS_TEST } from "./env";
import {
	persistConfig,
	readConfigJson,
	resolveConfig,
	validateConfig,
} from "./load";
import { type Messages, resolveMessages } from "./messages";
import type { Config } from "./schema";
import {
	applySettings,
	type BotSettingsSnapshot,
	type BotSettingsUpdate,
	snapshotSettings,
} from "./settings";

const rawConfig = readConfigJson();
const scalarConfig = resolveConfig(rawConfig);
const validation = validateConfig(scalarConfig);

export const CONFIG: Config & { MESSAGES: Messages } = {
	...scalarConfig,
	MESSAGES: resolveMessages(rawConfig.messages),
};

if (validation.fatal.length > 0 && !IS_TEST) {
	console.error(
		`FATAL: Missing required configuration: ${validation.fatal.join(", ")}`,
	);
	console.error("Please set them in config.json or as environment variables.");
	process.exit(1);
}

for (const warning of validation.warnings) {
	console.warn(`WARNING: ${warning}`);
}

export type { BotSettingsSnapshot, BotSettingsUpdate };

export function getBotSettingsSnapshot(): BotSettingsSnapshot {
	return snapshotSettings(CONFIG);
}

export function updateBotSettings(settings: BotSettingsUpdate): void {
	if (!applySettings(CONFIG, rawConfig, settings)) return;
	persistConfig(rawConfig);
}
