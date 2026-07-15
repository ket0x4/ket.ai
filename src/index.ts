import { runMigrations, db } from "./db/index.ts";
import { startBot, bot } from "./services/bot.ts";

async function main() {
  console.log("-----------------------------------------");
  console.log("Starting ket.ai 2");
  console.log("-----------------------------------------");

  // 1. Run migrations to initialize SQLite tables
  runMigrations();

  // 2. Start the bot client (long polling)
  await startBot();
}

// Graceful shutdown handling
const shutdown = () => {
  console.log("\nReceived shutdown signal. Stopping bot and closing database...");
  try {
    bot.stop();
    console.log("Bot polling stopped.");
  } catch (error) {
    console.error("Error stopping bot:", error);
  }
  try {
    db.close();
    console.log("Database closed successfully. Exiting.");
  } catch (error) {
    console.error("Error closing database:", error);
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("Fatal error during bot initialization:", err);
  process.exit(1);
});
