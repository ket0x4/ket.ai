import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { CONFIG } from "../config/index.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const COLOR_CODES: Record<LogLevel, string> = {
	debug: "\x1b[36m", // Cyan
	info: "\x1b[32m", // Green
	warn: "\x1b[33m", // Yellow
	error: "\x1b[31m", // Red
};
const RESET_COLOR = "\x1b[0m";

class Logger {
	private logDir: string;
	private minLevel: LogLevel;

	constructor() {
		this.logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
		this.minLevel = CONFIG.LOG_LEVEL;
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}

	private formatTimestamp(): string {
		const d = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const ms = d.getMilliseconds().toString().padStart(3, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
	}

	private formatArgs(args: unknown[]): string {
		if (args.length === 0) return "";
		return args
			.map((arg) => {
				if (arg instanceof Error) {
					return arg.stack || arg.message;
				}
				if (typeof arg === "object" && arg !== null) {
					return util.inspect(arg, { depth: 4, colors: false });
				}
				return String(arg);
			})
			.join(" ");
	}

	private writeToFile(filePath: string, line: string): void {
		try {
			fs.appendFileSync(filePath, `${line}\n`, "utf-8");
		} catch (e) {
			console.error(`[Logger] Failed to write log to ${filePath}:`, e);
		}
	}

	public log(level: LogLevel, message: string, ...args: unknown[]): void {
		if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[this.minLevel]) {
			return;
		}

		const timestamp = this.formatTimestamp();
		const formattedMeta = this.formatArgs(args);
		const fullText = formattedMeta ? `${message} ${formattedMeta}` : message;

		// Console output with colors
		const color = COLOR_CODES[level];
		const levelBadge = `[${level.toUpperCase()}]`.padEnd(7);
		const consoleMsg = `${timestamp} ${color}${levelBadge}${RESET_COLOR} ${fullText}`;

		if (level === "error") {
			console.error(consoleMsg);
		} else if (level === "warn") {
			console.warn(consoleMsg);
		} else {
			console.log(consoleMsg);
		}

		// File output (plain text without ANSI codes)
		const fileMsg = `${timestamp} [${level.toUpperCase().padEnd(5)}] ${fullText}`;
		this.writeToFile(path.join(this.logDir, "app.log"), fileMsg);
		if (level === "warn" || level === "error") {
			this.writeToFile(path.join(this.logDir, "error.log"), fileMsg);
		}
	}

	public debug(message: string, ...args: unknown[]): void {
		this.log("debug", message, ...args);
	}

	public info(message: string, ...args: unknown[]): void {
		this.log("info", message, ...args);
	}

	public warn(message: string, ...args: unknown[]): void {
		this.log("warn", message, ...args);
	}

	public error(message: string | Error, ...args: unknown[]): void {
		if (message instanceof Error) {
			this.log("error", message.message, message, ...args);
		} else {
			this.log("error", message, ...args);
		}
	}
}

const logger = new Logger();
export default logger;
