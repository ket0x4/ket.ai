import type { LogLevel } from "./types";

export const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

export const COLOR_CODES: Record<LogLevel, string> = {
	debug: "\x1b[36m",
	info: "\x1b[32m",
	warn: "\x1b[33m",
	error: "\x1b[31m",
};

export const RESET_COLOR = "\x1b[0m";
