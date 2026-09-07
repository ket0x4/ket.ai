import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../src/config/index";
import logger from "../src/utils/logger";

describe("Logger System", () => {
	const logDir = path.resolve(process.cwd(), CONFIG.LOG_DIR);
	const appLogPath = path.join(logDir, "app.log");
	const errorLogPath = path.join(logDir, "error.log");

	test("Writes info log to app.log", () => {
		const testMsg = `TEST_INFO_LOG_${Date.now()}`;
		logger.info(testMsg);

		expect(fs.existsSync(appLogPath)).toBe(true);
		const content = fs.readFileSync(appLogPath, "utf-8");
		expect(content).toContain(testMsg);
		expect(content).toContain("[INFO ]");
	});

	test("Writes error log to both app.log and error.log", () => {
		const testErrMsg = `TEST_ERROR_LOG_${Date.now()}`;
		logger.error(testErrMsg);

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

		const errorContent = fs.readFileSync(errorLogPath, "utf-8");
		expect(errorContent).toContain("Custom test error stack");
	});
});
