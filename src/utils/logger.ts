import fs from "fs";
import path from "path";
import zlib from "zlib";
import util from "util";
import { CONFIG } from "../config/index.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLOR_CODES: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
};
const RESET_COLOR = "\x1b[0m";

class Logger {
  private logDir: string;
  private archiveDir: string;
  private minLevel: LogLevel;
  private maxSizeBytes: number;
  private retentionMs: number;

  constructor() {
    this.logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
    this.archiveDir = path.join(this.logDir, "archive");
    this.minLevel = CONFIG.LOG_LEVEL;
    this.maxSizeBytes = CONFIG.LOG_MAX_SIZE_MB * 1024 * 1024;
    this.retentionMs = CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    this.ensureDirectories();
    this.cleanArchivedLogs();
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

  private formatArgs(args: any[]): string {
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

  private rotateFileIfNeeded(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) return;
      const stats = fs.statSync(filePath);

      if (stats.size >= this.maxSizeBytes) {
        const fileBase = path.basename(filePath, ".log");
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-");
        const archiveName = `${fileBase}-${timestamp}.log`;
        const tempArchivePath = path.join(this.archiveDir, archiveName);
        const compressedPath = `${tempArchivePath}.gz`;

        fs.renameSync(filePath, tempArchivePath);

        const content = fs.readFileSync(tempArchivePath);
        const compressed = zlib.gzipSync(content);
        fs.writeFileSync(compressedPath, compressed);
        fs.unlinkSync(tempArchivePath);

        this.cleanArchivedLogs();
      }
    } catch (e) {
      console.error(`[Logger] Failed to rotate log file ${filePath}:`, e);
    }
  }

  private writeToFile(filePath: string, formattedMessage: string): void {
    try {
      this.ensureDirectories();
      this.rotateFileIfNeeded(filePath);
      fs.appendFileSync(filePath, formattedMessage + "\n", "utf-8");
    } catch (e) {
      console.error(`[Logger] Failed to write to file ${filePath}:`, e);
    }
  }

  public log(level: LogLevel, message: string, ...args: any[]): void {
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
    this.writeToFile(appLogPath, fileMsg);

    // Error log (warn and error only)
    if (level === "warn" || level === "error") {
      const errorLogPath = path.join(this.logDir, "error.log");
      this.writeToFile(errorLogPath, fileMsg);
    }
  }

  public debug(message: string, ...args: any[]): void {
    this.log("debug", message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log("info", message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log("warn", message, ...args);
  }

  public error(message: string | Error, ...args: any[]): void {
    if (message instanceof Error) {
      this.log("error", message.message, message, ...args);
    } else {
      this.log("error", message, ...args);
    }
  }
}

export const logger = new Logger();
export default logger;
