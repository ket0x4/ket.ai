import util from "node:util";
import { COLOR_CODES, RESET_COLOR } from "./levels";
import type { LogLevel } from "./types";

const FILE_LINE_REGEX =
	/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[([A-Z]+)\s*\]\s?(.*)$/;

export function formatTimestamp(date = new Date()): string {
	const pad = (value: number) => value.toString().padStart(2, "0");
	const ms = date.getMilliseconds().toString().padStart(3, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
}

export function formatArgs(args: unknown[]): string {
	if (args.length === 0) return "";
	return args
		.map((arg) => {
			if (arg instanceof Error) return arg.stack || arg.message;
			if (typeof arg === "object" && arg !== null) {
				return util.inspect(arg, { depth: 4, colors: false });
			}
			return String(arg);
		})
		.join(" ");
}

export function formatConsoleLine(
	level: LogLevel,
	timestamp: string,
	message: string,
): string {
	const badge = `[${level.toUpperCase()}]`.padEnd(7);
	return `${timestamp} ${COLOR_CODES[level]}${badge}${RESET_COLOR} ${message}`;
}

export function formatFileLine(
	level: LogLevel,
	timestamp: string,
	message: string,
): string {
	return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}`;
}

export function parseLogLine(line: string): {
	timestamp: string;
	level: string;
	message: string;
} | null {
	const match = FILE_LINE_REGEX.exec(line);
	if (!match) return null;
	return {
		timestamp: match[1],
		level: match[2],
		message: match[3] ?? "",
	};
}
