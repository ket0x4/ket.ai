import { db } from "./db/index";
import { startServer, stopServer } from "./server/index";
import { startBot, stopBot } from "./services/bot/index";
import logger from "./utils/logger";

async function main() {
	logger.info("[Main] Starting ket.ai...");
	startServer();
	await startBot();
}

const shutdown = async () => {
	logger.info(
		"[Main] Received shutdown signal. Stopping bot, web server and closing database...",
	);
	try {
		stopServer();
	} catch (error) {
		logger.error("[Main] Error stopping web server:", error);
	}
	try {
		await stopBot();
		logger.info("[Main] Bot polling stopped.");
	} catch (error) {
		logger.error("[Main] Error stopping bot:", error);
	}
	try {
		db.close();
		logger.info("[Main] Database closed successfully. Exiting.");
	} catch (error) {
		logger.error("[Main] Error closing database:", error);
	}
	// Persist any buffered log lines before exiting.
	logger.flushSync();
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
	logger.error("[Main] Fatal error during bot initialization:", err);
	logger.flushSync();
	process.exit(1);
});
