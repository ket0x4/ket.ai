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

type LogSink = "app" | "error";

class Logger {
	private logDir: string;
	private minLevel: LogLevel;
	private appLogPath: string;
	private errorLogPath: string;
	private maxBytes: number;
	private isTestEnv: boolean;
	private appBytes = 0;
	private errorBytes = 0;
	private appBuffer: string[] = [];
	private errorBuffer: string[] = [];
	private flushScheduled = false;

	constructor() {
		this.logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
		this.minLevel = CONFIG.LOG_LEVEL;
		this.isTestEnv =
			process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";

		const maxMb = CONFIG.LOG_MAX_SIZE_MB;
		this.maxBytes =
			typeof maxMb === "number" && maxMb > 0 ? maxMb * 1024 * 1024 : 0;

		this.appLogPath = path.join(this.logDir, "app.log");
		this.errorLogPath = path.join(this.logDir, "error.log");

		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}

		this.appBytes = this.safeSize(this.appLogPath);
		this.errorBytes = this.safeSize(this.errorLogPath);
	}

	private safeSize(filePath: string): number {
		try {
			return fs.statSync(filePath).size;
		} catch {
			return 0;
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

	private currentBytes(sink: LogSink): number {
		return sink === "app" ? this.appBytes : this.errorBytes;
	}

	private addBytes(sink: LogSink, bytes: number): void {
		if (sink === "app") this.appBytes += bytes;
		else this.errorBytes += bytes;
	}

	/** Rotates `<file>.log` to `<file>.log.1` once the size limit would be exceeded. */
	private rotateIfNeeded(
		filePath: string,
		sink: LogSink,
		incomingBytes: number,
	): void {
		if (this.maxBytes <= 0) return;
		if (this.currentBytes(sink) + incomingBytes <= this.maxBytes) return;

		try {
			const rotated = `${filePath}.1`;
			fs.rmSync(rotated, { force: true });
			fs.renameSync(filePath, rotated);
		} catch {
			// Rotation is best-effort; on failure we keep appending to the same file.
		}
		if (sink === "app") this.appBytes = 0;
		else this.errorBytes = 0;
	}

	/** Non-blocking batched append used in production. */
	private appendAsync(filePath: string, sink: LogSink, lines: string[]): void {
		if (lines.length === 0) return;
		const data = `${lines.join("\n")}\n`;
		const bytes = Buffer.byteLength(data);
		this.rotateIfNeeded(filePath, sink, bytes);
		this.addBytes(sink, bytes);
		fs.appendFile(filePath, data, (e) => {
			if (e) console.error(`[Logger] Failed to write log to ${filePath}:`, e);
		});
	}

	/** Synchronous append used in tests so logs are readable immediately. */
	private appendSync(filePath: string, sink: LogSink, lines: string[]): void {
		if (lines.length === 0) return;
		const data = `${lines.join("\n")}\n`;
		const bytes = Buffer.byteLength(data);
		this.rotateIfNeeded(filePath, sink, bytes);
		this.addBytes(sink, bytes);
		try {
			fs.appendFileSync(filePath, data, "utf-8");
		} catch (e) {
			console.error(`[Logger] Failed to write log to ${filePath}:`, e);
		}
	}

	private scheduleFlush(): void {
		if (this.flushScheduled) return;
		this.flushScheduled = true;
		setImmediate(() => this.flush());
	}

	/** Flushes buffered log lines to disk without blocking the event loop. */
	public flush(): void {
		this.flushScheduled = false;
		const appLines = this.appBuffer;
		const errorLines = this.errorBuffer;
		this.appBuffer = [];
		this.errorBuffer = [];
		this.appendAsync(this.appLogPath, "app", appLines);
		this.appendAsync(this.errorLogPath, "error", errorLines);
	}

	/** Synchronously flushes buffers; use during shutdown to avoid losing logs. */
	public flushSync(): void {
		this.flushScheduled = false;
		const appLines = this.appBuffer;
		const errorLines = this.errorBuffer;
		this.appBuffer = [];
		this.errorBuffer = [];
		this.appendSync(this.appLogPath, "app", appLines);
		this.appendSync(this.errorLogPath, "error", errorLines);
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
		const fileLine = `${timestamp} [${level.toUpperCase().padEnd(5)}] ${fullText}`;

		if (this.isTestEnv) {
			this.appendSync(this.appLogPath, "app", [fileLine]);
			if (level === "warn" || level === "error") {
				this.appendSync(this.errorLogPath, "error", [fileLine]);
			}
			return;
		}

		this.appBuffer.push(fileLine);
		if (level === "warn" || level === "error") {
			this.errorBuffer.push(fileLine);
		}
		this.scheduleFlush();
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
