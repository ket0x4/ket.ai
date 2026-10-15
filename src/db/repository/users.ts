import logger from "../../utils/logger";
import { stmts } from "./statements";

// ponytail: In-memory Sets for instant O(1) opt-out check on every message.
// Ceiling: multi-instance scaling; upgrade path: Redis Set or PubSub if scaled horizontally.
export const optedOutUserIds = new Set<number>();
const optedOutUsernames = new Set<string>();

function initOptedOutCache() {
	try {
		const rows = stmts.getOptedOutUsers.all() as Array<{
			user_id: number;
			username?: string | null;
		}>;
		for (const r of rows) {
			optedOutUserIds.add(r.user_id);
			if (r.username) {
				optedOutUsernames.add(r.username.toLowerCase());
			}
		}
	} catch (e) {
		logger.warn("[Repository] Failed to initialize opted-out users cache:", e);
	}
}
initOptedOutCache();

export const userMethods = {
	/**
	 * Checks if a user has opted out of bot interactions and memory by ID.
	 */
	isUserOptedOut(userId?: number | null): boolean {
		if (!userId || userId <= 0) return false;
		return optedOutUserIds.has(userId);
	},

	/**
	 * Checks if a user has opted out of bot interactions and memory by username.
	 */
	isUsernameOptedOut(username?: string | null): boolean {
		if (!username) return false;
		const clean = username.replace(/^@/, "").trim().toLowerCase();
		return optedOutUsernames.has(clean);
	},

	/**
	 * Sets the opt-out status for a specific user.
	 */
	setUserOptOut(
		userId: number,
		isOptedOut: boolean,
		details?: { username?: string; firstName?: string },
	): void {
		if (!userId || userId <= 0) return;
		const now = Math.floor(Date.now() / 1000);
		const optValue = isOptedOut ? 1 : 0;

		stmts.insertUserWithOptOut.run(
			userId,
			details?.username || null,
			details?.firstName || null,
			optValue,
			now,
		);

		if (isOptedOut) {
			optedOutUserIds.add(userId);
			if (details?.username) {
				optedOutUsernames.add(details.username.toLowerCase());
			}
		} else {
			optedOutUserIds.delete(userId);
			if (details?.username) {
				optedOutUsernames.delete(details.username.toLowerCase());
			}
		}
	},

	/**
	 * Returns all currently opted-out user IDs.
	 */
	getOptedOutUserIds(): number[] {
		return Array.from(optedOutUserIds);
	},

	/**
	 * Returns all currently opted-out usernames.
	 */
	getOptedOutUsernames(): string[] {
		return Array.from(optedOutUsernames);
	},

	/**
	 * Looks up a Telegram user by username or first name.
	 */
	getUserByName(name: string): {
		user_id: number;
		username: string | null;
		first_name: string | null;
		last_updated: number;
	} | null {
		if (!name?.trim()) return null;
		const clean = name.trim().toLowerCase();
		return (
			(stmts.findUserByName.get(clean, clean) as {
				user_id: number;
				username: string | null;
				first_name: string | null;
				last_updated: number;
			} | null) || null
		);
	},

	/**
	 * Retrieves all chat IDs where a specific user has interacted.
	 */
	getUserMemberChatIds(userId: number): string[] {
		const rows = stmts.getUserMemberChatIds.all(userId) as {
			chat_id: string;
		}[];
		const set = new Set(rows.map((r) => r.chat_id));
		set.add(userId.toString());
		return Array.from(set);
	},

	/**
	 * Retrieves summary statistics for a regular user.
	 */
	getUserStats(userId: number): {
		totalMessages: number;
		totalMemories: number;
		totalGroups: number;
	} {
		const res = stmts.getUserStats.get(userId, userId, userId) as {
			total_messages: number;
			total_memories: number;
			total_groups: number;
		} | null;

		return {
			totalMessages: res?.total_messages || 0,
			totalMemories: res?.total_memories || 0,
			totalGroups: res?.total_groups || 0,
		};
	},
};
