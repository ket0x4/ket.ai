import { db } from "./db/index";
import { startBot, bot } from "./services/bot";
import logger from "./utils/logger";

async function main() {
  logger.info("-----------------------------------------");
  logger.info("Starting ket.ai 2");
  logger.info("-----------------------------------------");

  // 1. Database migrations run automatically on import of db module

  // 2. Start the bot client (long polling)
  await startBot();
}

// Graceful shutdown handling
const shutdown = () => {
  logger.info("Received shutdown signal. Stopping bot and closing database...");
  try {
    bot.stop();
    logger.info("Bot polling stopped.");
  } catch (error) {
    logger.error("Error stopping bot:", error);
  }
  try {
    db.close();
    logger.info("Database closed successfully. Exiting.");
  } catch (error) {
    logger.error("Error closing database:", error);
  }
  // Flush any buffered log lines before exiting
  logger.shutdown();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  logger.error("Fatal error during bot initialization:", err);
  process.exit(1);
});
