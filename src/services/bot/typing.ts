import type { Context } from "grammy";

/**
 * Helper to run an async operation while showing a "typing" indicator to users.
 */
export async function withTyping(ctx: Context, action: () => Promise<void>) {
	try {
		await ctx.replyWithChatAction("typing");
	} catch {
		// Ignore error if chat action fails
	}

	// Keep sending typing action every 4 seconds since Telegram times it out after 5s
	const interval = setInterval(() => {
		ctx.replyWithChatAction("typing").catch(() => {});
	}, 4000);

	try {
		await action();
	} finally {
		clearInterval(interval);
	}
}
