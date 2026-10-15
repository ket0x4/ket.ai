import { Bot as GrammyBot } from "grammy";
import { CONFIG } from "../../config/index";

export const bot = new GrammyBot(
	CONFIG.TELEGRAM_BOT_TOKEN || "000000000:TEST_MOCK_TELEGRAM_TOKEN",
);

export let botUsername = "";

export function setBotUsername(username: string): void {
	botUsername = username;
}
