import { db } from "./db/index";
import { startServer, stopServer } from "./server/index";
import { bot, startBot } from "./services/bot";
import logger from "./utils/logger";

async function main() {
	logger.info("[Main] Starting ket.ai...");
	// Start HTTP Web Server for Telegram Mini App
	startServer();
	// Start the bot client (long polling)
	await startBot();
}

// Graceful shutdown handling
const shutdown = () => {
	logger.info(
	"[Main] Received shutdown signal. Stopping bot, web server and closing database...",
	);
	try {
		stopServer();
	} catch (error) {
		logger.error("[Main] Error stopping web server:", error);
	}
	try {
		bot.stop();
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
	// Flush any buffered log lines before exiting
	logger.shutdown();
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
	logger.error("[Main] Fatal error during bot initialization:", err);
	process.exit(1);
});
