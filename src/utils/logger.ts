import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import zlib from "node:zlib";
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

// ponytail: streamlined direct file logger without background workers or write queue
class Logger {
	private logDir: string;
	private archiveDir: string;
	private minLevel: LogLevel;
	public maxSizeBytes: number;

	constructor() {
		this.logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
		this.archiveDir = path.join(this.logDir, "archive");
		this.minLevel = CONFIG.LOG_LEVEL;
		this.maxSizeBytes = CONFIG.LOG_MAX_SIZE_MB * 1024 * 1024;
		this.ensureDirectories();
	}

	private ensureDirectories(): void {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
		if (!fs.existsSync(this.archiveDir)) {
			fs.mkdirSync(this.archiveDir, { recursive: true });
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
			this.ensureDirectories();
			if (fs.existsSync(filePath)) {
				const size = fs.statSync(filePath).size;
				if (size >= this.maxSizeBytes) {
					const fileBase = path.basename(filePath, ".log");
					const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
					const archivePath = path.join(
						this.archiveDir,
						`${fileBase}-${timestamp}.log.gz`,
					);
					const compressed = zlib.gzipSync(fs.readFileSync(filePath));
					fs.writeFileSync(archivePath, compressed);
					fs.truncateSync(filePath, 0);
				}
			}
			fs.appendFileSync(filePath, `${line}\n`, "utf-8");
		} catch (e) {
			console.error(`[Logger] Failed to write log to ${filePath}:`, e);
		}
	}

	public flush(): void {}
	public shutdown(): void {}

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
