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

/** Interval in milliseconds for flushing buffered log writes */
const FLUSH_INTERVAL_MS = 200;

class Logger {
	private logDir: string;
	private archiveDir: string;
	private minLevel: LogLevel;
	private maxSizeBytes: number;
	private retentionMs: number;

	// Write buffer: accumulates log lines per file path and flushes periodically
	private writeBuffer: Map<string, string[]> = new Map();
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	// Cache last known file sizes to avoid statSync on every write
	private fileSizeCache: Map<string, number> = new Map();

	constructor() {
		this.logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
		this.archiveDir = path.join(this.logDir, "archive");
		this.minLevel = CONFIG.LOG_LEVEL;
		this.maxSizeBytes = CONFIG.LOG_MAX_SIZE_MB * 1024 * 1024;
		this.retentionMs = CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

		this.ensureDirectories();
		this.cleanArchivedLogs();
		this.startFlushTimer();
	}

	private ensureDirectories(): void {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
		if (!fs.existsSync(this.archiveDir)) {
			fs.mkdirSync(this.archiveDir, { recursive: true });
		}
	}

	private cleanArchivedLogs(): void {
		try {
			if (!fs.existsSync(this.archiveDir)) return;
			const now = Date.now();
			const files = fs.readdirSync(this.archiveDir);

			for (const file of files) {
				const filePath = path.join(this.archiveDir, file);
				const stats = fs.statSync(filePath);
				if (now - stats.mtimeMs > this.retentionMs) {
					fs.unlinkSync(filePath);
				}
			}
		} catch {
			// Ignore background cleanup errors
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

	/**
	 * Rotates a log file if it exceeds the max size.
	 * Compression is done asynchronously to avoid blocking the event loop.
	 */
	private rotateFileIfNeeded(filePath: string): void {
		try {
			const cachedSize = this.fileSizeCache.get(filePath);
			// Only check actual file stats periodically (when cache is stale or missing)
			if (cachedSize !== undefined && cachedSize < this.maxSizeBytes) {
				return;
			}

			if (!fs.existsSync(filePath)) return;
			const stats = fs.statSync(filePath);
			this.fileSizeCache.set(filePath, stats.size);

			if (stats.size >= this.maxSizeBytes) {
				const fileBase = path.basename(filePath, ".log");
				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const archiveName = `${fileBase}-${timestamp}.log`;
				const tempArchivePath = path.join(this.archiveDir, archiveName);
				const compressedPath = `${tempArchivePath}.gz`;

				// Rename is fast (atomic on same filesystem)
				fs.renameSync(filePath, tempArchivePath);
				this.fileSizeCache.set(filePath, 0);

				// Compress asynchronously to avoid blocking the event loop
				fs.readFile(tempArchivePath, (readErr, content) => {
					if (readErr) {
						console.error(
							`[Logger] Failed to read log for compression: ${tempArchivePath}`,
							readErr,
						);
						return;
					}
					zlib.gzip(content, (gzErr, compressed) => {
						if (gzErr) {
							console.error(
								`[Logger] Failed to compress log: ${tempArchivePath}`,
								gzErr,
							);
							return;
						}
						fs.writeFile(compressedPath, compressed, (writeErr) => {
							if (writeErr) {
								console.error(
									`[Logger] Failed to write compressed log: ${compressedPath}`,
									writeErr,
								);
								return;
							}
							fs.unlink(tempArchivePath, () => {});
							this.cleanArchivedLogs();
						});
					});
				});
			}
		} catch (e) {
			console.error(`[Logger] Failed to rotate log file ${filePath}:`, e);
		}
	}

	/**
	 * Enqueues a log line for buffered writing.
	 * Lines are batched and flushed every FLUSH_INTERVAL_MS.
	 */
	private enqueueWrite(filePath: string, formattedMessage: string): void {
		const existing = this.writeBuffer.get(filePath);
		if (existing) {
			existing.push(formattedMessage);
		} else {
			this.writeBuffer.set(filePath, [formattedMessage]);
		}
	}

	/**
	 * Flushes all buffered log lines to their respective files.
	 * Uses synchronous write to ensure data is persisted before process exit,
	 * but the batching reduces the number of syscalls significantly.
	 */
	public flush(): void {
		if (this.writeBuffer.size === 0) return;

		this.ensureDirectories();

		for (const [filePath, lines] of this.writeBuffer) {
			try {
				this.rotateFileIfNeeded(filePath);
				const content = `${lines.join("\n")}\n`;
				fs.appendFileSync(filePath, content, "utf-8");

				// Update cached file size estimate
				const currentSize = this.fileSizeCache.get(filePath) ?? 0;
				this.fileSizeCache.set(filePath, currentSize + content.length);
			} catch (e) {
				console.error(`[Logger] Failed to flush to file ${filePath}:`, e);
			}
		}

		this.writeBuffer.clear();
	}

	private startFlushTimer(): void {
		this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
		// Allow the process to exit even if the timer is running
		if (this.flushTimer.unref) {
			this.flushTimer.unref();
		}
	}

	/**
	 * Immediately flushes any buffered log lines. Call during graceful shutdown.
	 */
	public shutdown(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		this.flush();
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

		// App combined log
		const appLogPath = path.join(this.logDir, "app.log");
		this.enqueueWrite(appLogPath, fileMsg);

		// Error log (warn and error only)
		if (level === "warn" || level === "error") {
			const errorLogPath = path.join(this.logDir, "error.log");
			this.enqueueWrite(errorLogPath, fileMsg);
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
