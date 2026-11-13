import fs from "node:fs";
import path from "node:path";
import { IS_TEST } from "../config/env.js";
import { CONFIG } from "../config/index.js";
import {
	formatArgs,
	formatConsoleLine,
	formatFileLine,
	formatTimestamp,
} from "./log/format";
import { LOG_LEVEL_SEVERITY } from "./log/levels";
import { RotatingFileSink } from "./log/sink";
import type { LogLevel } from "./log/types";

class Logger {
	private readonly appSink: RotatingFileSink;
	private readonly errorSink: RotatingFileSink;
	private readonly isTestEnv: boolean;
	private appBuffer: string[] = [];
	private errorBuffer: string[] = [];
	private flushScheduled = false;

	constructor() {
		this.isTestEnv = IS_TEST;

		const logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}

		const maxBytes = CONFIG.LOG_MAX_SIZE_MB * 1024 * 1024;
		this.appSink = new RotatingFileSink(path.join(logDir, "app.log"), maxBytes);
		this.errorSink = new RotatingFileSink(
			path.join(logDir, "error.log"),
			maxBytes,
		);
	}

	private drain(): { app: string[]; error: string[] } {
		const app = this.appBuffer;
		const error = this.errorBuffer;
		this.appBuffer = [];
		this.errorBuffer = [];
		return { app, error };
	}

	private scheduleFlush(): void {
		if (this.flushScheduled) return;
		this.flushScheduled = true;
		setImmediate(() => this.flush());
	}

	/** Flushes buffered lines without blocking the event loop. */
	public flush(): void {
		this.flushScheduled = false;
		const { app, error } = this.drain();
		this.appSink.write(app, false);
		this.errorSink.write(error, false);
	}

	/** Synchronously flushes buffers; use during shutdown to avoid losing logs. */
	public flushSync(): void {
		this.flushScheduled = false;
		const { app, error } = this.drain();
		this.appSink.write(app, true);
		this.errorSink.write(error, true);
	}

	public log(level: LogLevel, message: string, ...args: unknown[]): void {
		if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[CONFIG.LOG_LEVEL]) {
			return;
		}

		const timestamp = formatTimestamp();
		const argsText = formatArgs(args);
		const fullText = argsText ? `${message} ${argsText}` : message;

		const consoleLine = formatConsoleLine(level, timestamp, fullText);
		if (level === "error") {
			console.error(consoleLine);
		} else if (level === "warn") {
			console.warn(consoleLine);
		} else {
			console.log(consoleLine);
		}

		const fileLine = formatFileLine(level, timestamp, fullText);
		if (this.isTestEnv) {
			this.appSink.write([fileLine], true);
			if (level === "warn" || level === "error") {
				this.errorSink.write([fileLine], true);
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
