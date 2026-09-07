import { InlineKeyboard } from "grammy";
import { CONFIG } from "../../config";

export function buildMiniAppKeyboard(
	isPrivate: boolean,
	botUsername?: string,
): InlineKeyboard {
	const appUrl = CONFIG.WEB_APP_URL || `http://localhost:${CONFIG.WEB_PORT}`;
	const keyboard = new InlineKeyboard();

	if (isPrivate) {
		keyboard.webApp("Open Dashboard", appUrl);
	} else if (botUsername) {
		keyboard.url(
			"Open Mini App",
			`https://t.me/${botUsername}?startapp=dashboard`,
		);
	} else {
		keyboard.webApp("Open Dashboard", appUrl);
	}

	return keyboard;
}
