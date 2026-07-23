import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import logger from "../src/utils/logger";
import { CONFIG } from "../src/config/index";

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

  test("Rotates log file and compresses to archive when size threshold is reached", () => {
    const archiveDir = path.join(logDir, "archive");
    
    // Artificially reduce maxSizeBytes for testing rotation
    (logger as any).maxSizeBytes = 500; // 500 bytes

    // Write enough data to trigger rotation
    for (let i = 0; i < 20; i++) {
      logger.info(`ROTATION_TEST_LINE_${i}_` + "X".repeat(50));
    }

    // Reset maxSizeBytes
    (logger as any).maxSizeBytes = CONFIG.LOG_MAX_SIZE_MB * 1024 * 1024;

    expect(fs.existsSync(archiveDir)).toBe(true);
    const archivedFiles = fs.readdirSync(archiveDir);
    expect(archivedFiles.some((f) => f.endsWith(".log.gz"))).toBe(true);
  });
});
