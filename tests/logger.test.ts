import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../src/config/index";
import logger from "../src/utils/logger";

describe("Logger System", () => {
	const logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
	const appLogPath = path.join(logDir, "app.log");
	const errorLogPath = path.join(logDir, "error.log");

	/**
	 * Helper: flush buffered writes so we can read file content immediately.
	 * The refactored logger buffers writes for performance, so tests need
	 * to call this before asserting on file content.
	 */
	function flushLogs(): void {
		logger.flush();
	}

	test("Writes info log to app.log", () => {
		const testMsg = `TEST_INFO_LOG_${Date.now()}`;
		logger.info(testMsg);
		flushLogs();

		expect(fs.existsSync(appLogPath)).toBe(true);
		const content = fs.readFileSync(appLogPath, "utf-8");
		expect(content).toContain(testMsg);
		expect(content).toContain("[INFO ]");
	});

	test("Writes error log to both app.log and error.log", () => {
		const testErrMsg = `TEST_ERROR_LOG_${Date.now()}`;
		logger.error(testErrMsg);
		flushLogs();

		expect(fs.existsSync(errorLogPath)).toBe(true);
		const appContent = fs.readFileSync(appLogPath, "utf-8");
		const errorContent = fs.readFileSync(errorLogPath, "utf-8");

		expect(appContent).toContain(testErrMsg);
		expect(errorContent).toContain(testErrMsg);
		expect(errorContent).toContain("[ERROR]");
	});

	test("Formats Error object stack trace correctly", () => {
		const err = new Error("Custom test error stack");
		logger.error(err);
		flushLogs();

		const errorContent = fs.readFileSync(errorLogPath, "utf-8");
		expect(errorContent).toContain("Custom test error stack");
	});

	test("Rotates log file and compresses to archive when size threshold is reached", async () => {
		const archiveDir = path.join(logDir, "archive");

		const loggerInternal = logger as unknown as { maxSizeBytes: number };
		// Artificially reduce maxSizeBytes for testing rotation
		loggerInternal.maxSizeBytes = 500; // 500 bytes

		// Write enough data to trigger rotation
		for (let i = 0; i < 20; i++) {
			logger.info(`ROTATION_TEST_LINE_${i}_${"X".repeat(50)}`);
		}
		logger.flush();

		// Wait briefly for asynchronous gzip compression
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Reset maxSizeBytes
		loggerInternal.maxSizeBytes = CONFIG.LOG_MAX_SIZE_MB * 1024 * 1024;

		expect(fs.existsSync(archiveDir)).toBe(true);
		const archivedFiles = fs.readdirSync(archiveDir);
		expect(archivedFiles.some((f) => f.endsWith(".log.gz"))).toBe(true);
	});
});
