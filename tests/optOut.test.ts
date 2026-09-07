import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import crypto from "node:crypto";
import { CONFIG } from "../src/config/index";
import { db } from "../src/db/index";
import { Repository } from "../src/db/repository";
import { startServer, stopServer } from "../src/server/index";
import { processNewMemory } from "../src/services/gemini/memory";

function createSignedInitData(user: {
	id: number;
	first_name: string;
	username?: string;
}) {
	const userStr = JSON.stringify(user);
	const authDate = Math.floor(Date.now() / 1000).toString();
	const params = [`auth_date=${authDate}`, `user=${userStr}`].sort();
	const dataCheckString = params.join("\n");
	const secretKey = crypto
		.createHmac("sha256", "WebAppData")
		.update(CONFIG.TELEGRAM_BOT_TOKEN)
		.digest();
	const hash = crypto
		.createHmac("sha256", secretKey)
		.update(dataCheckString)
		.digest("hex");
	return `auth_date=${authDate}&user=${encodeURIComponent(userStr)}&hash=${hash}`;
}

describe("User Opt-Out & Opt-In Feature", () => {
	const TEST_USER_ID = 88776655;
	const TEST_CHAT_ID = "-10099887766";
	let _server: ReturnType<typeof startServer>;

	beforeAll(() => {
		_server = startServer();
	});

	afterAll(() => {
		stopServer();
		Repository.setUserOptOut(TEST_USER_ID, false);
	});

	test("Repository: Default opt-out state is false", () => {
		expect(Repository.isUserOptedOut(TEST_USER_ID)).toBe(false);
		expect(Repository.isUserOptedOut(0)).toBe(false);
		expect(Repository.isUserOptedOut(null)).toBe(false);
		expect(Repository.isUserOptedOut(undefined)).toBe(false);
	});

	test("Repository: setUserOptOut updates both cache and database persistence", () => {
		// 1. Opt out
		Repository.setUserOptOut(TEST_USER_ID, true, {
			username: "optout_tester",
			firstName: "OptOut Tester",
		});

		expect(Repository.isUserOptedOut(TEST_USER_ID)).toBe(true);
		expect(Repository.getOptedOutUserIds()).toContain(TEST_USER_ID);

		// Verify database row
		const row = db
			.prepare("SELECT is_opted_out FROM users WHERE user_id = ?")
			.get(TEST_USER_ID) as { is_opted_out: number } | null;
		expect(row?.is_opted_out).toBe(1);

		// 2. Opt back in
		Repository.setUserOptOut(TEST_USER_ID, false);
		expect(Repository.isUserOptedOut(TEST_USER_ID)).toBe(false);
		expect(Repository.getOptedOutUserIds()).not.toContain(TEST_USER_ID);

		const updatedRow = db
			.prepare("SELECT is_opted_out FROM users WHERE user_id = ?")
			.get(TEST_USER_ID) as { is_opted_out: number } | null;
		expect(updatedRow?.is_opted_out).toBe(0);
	});

	test("Memory Protection: processNewMemory refuses to save facts for opted-out users or username prefixes", async () => {
		const userId = 77665544;
		Repository.setUserOptOut(userId, true, { username: "secret_agent" });

		const initialMemCount = Repository.getMemories(TEST_CHAT_ID).length;

		// 1. Refusal by explicit userId
		await processNewMemory(TEST_CHAT_ID, "Tester likes Earl Grey tea", {
			userId,
			category: "PROFILE",
		});
		expect(Repository.getMemories(TEST_CHAT_ID).length).toBe(initialMemCount);

		// 2. Refusal by username prefix even without userId
		await processNewMemory(
			TEST_CHAT_ID,
			"secret_agent: lives in an undisclosed location",
			{
				category: "PROFILE",
			},
		);
		expect(Repository.getMemories(TEST_CHAT_ID).length).toBe(initialMemCount);

		// Clean up opt-out state
		Repository.setUserOptOut(userId, false);
	});

	test("Repository: getMemories completely excludes memories of opted-out users directly", () => {
		const userA = 112233;
		const userB = 445566;
		const chatId = `test_chat_rag_${Date.now()}`;
		Repository.createChat(chatId, "RAG Test Chat", true);

		Repository.addMemory(chatId, "Alice likes reading books", [0.1, 0.2], {
			userId: userA,
			category: "PROFILE",
		});
		Repository.addMemory(chatId, "Bob moved to Amsterdam", [0.2, 0.3], {
			userId: userB,
			category: "PROFILE",
		});

		// Both present before opt-out
		const memoriesBefore = Repository.getMemories(chatId);
		expect(memoriesBefore.some((m) => m.userId === userB)).toBe(true);
		expect(memoriesBefore.some((m) => m.userId === userA)).toBe(true);

		// User B opts out
		Repository.setUserOptOut(userB, true, { username: "bob_amsterdam" });

		// Direct call to Repository.getMemories(chatId) MUST exclude userB
		const memoriesAfter = Repository.getMemories(chatId);
		expect(memoriesAfter.some((m) => m.userId === userB)).toBe(false);
		expect(memoriesAfter.some((m) => m.userId === userA)).toBe(true);

		// getUserMemories and getUserAllMemories also return empty for userB
		expect(Repository.getUserMemories(chatId, userB).length).toBe(0);
		expect(Repository.getUserAllMemories(userB).length).toBe(0);
		expect(Repository.getUserMemories(chatId, userA).length).toBe(1);

		// Clean up
		Repository.setUserOptOut(userB, false);
		Repository.clearMemories(chatId);
	});

	test("Repository: getRecentMessages completely excludes messages from opted-out users", () => {
		const chatId = `test_chat_recent_${Date.now()}`;
		const userActive = 1234001;
		const userOptedOut = 1234002;
		const now = Math.floor(Date.now() / 1000);

		Repository.createChat(chatId, "History Opt-Out Test Chat", true);

		// Insert messages: Active user, Opted-out user, Bot reply
		Repository.saveMessage({
			chatId,
			messageId: 101,
			userId: userActive,
			username: "alice",
			firstName: "Alice",
			text: "Hello from Alice",
			sentAt: now - 30,
		});
		Repository.saveMessage({
			chatId,
			messageId: 102,
			userId: userOptedOut,
			username: "bob",
			firstName: "Bob",
			text: "Sensitive statement from Bob",
			sentAt: now - 20,
		});
		Repository.saveMessage({
			chatId,
			messageId: 103,
			userId: 0,
			username: "ket",
			firstName: "ket.ai",
			text: "Bot reply to group",
			isBotReply: true,
			sentAt: now - 10,
		});

		// Both user messages present before opt-out
		const beforeOptOut = Repository.getRecentMessages(chatId, 10);
		expect(beforeOptOut.some((m) => m.user_id === userOptedOut)).toBe(true);
		expect(beforeOptOut.some((m) => m.user_id === userActive)).toBe(true);

		// User Bob opts out
		Repository.setUserOptOut(userOptedOut, true, { username: "bob" });

		// After Bob opts out: getRecentMessages MUST NOT return Bob's messages
		const afterOptOut = Repository.getRecentMessages(chatId, 10);
		expect(afterOptOut.some((m) => m.user_id === userOptedOut)).toBe(false);
		expect(afterOptOut.some((m) => m.user_id === userActive)).toBe(true);
		expect(afterOptOut.some((m) => m.is_bot_reply === 1)).toBe(true);

		// Bob opts back in
		Repository.setUserOptOut(userOptedOut, false, { username: "bob" });
		const afterOptIn = Repository.getRecentMessages(chatId, 10);
		expect(afterOptIn.some((m) => m.user_id === userOptedOut)).toBe(true);

		// Clean up
		Repository.clearChatHistory(chatId);
	});

	test("Web API: /api/user/opt-out endpoint toggles opt-out and /api/me reflects it", async () => {
		const webUser = {
			id: 66554433,
			first_name: "Web Tester",
			username: "webtester",
		};
		const initData = createSignedInitData(webUser);
		const baseUrl = `http://localhost:${CONFIG.WEB_PORT}`;

		// 1. Unauthorized request
		const unauthRes = await fetch(`${baseUrl}/api/user/opt-out`);
		expect(unauthRes.status).toBe(401);

		// 2. GET opt-out status (initially false)
		Repository.setUserOptOut(webUser.id, false);
		const getRes = await fetch(`${baseUrl}/api/user/opt-out`, {
			headers: { "x-telegram-init-data": initData },
		});
		expect(getRes.status).toBe(200);
		const getData = (await getRes.json()) as { isOptedOut: boolean };
		expect(getData.isOptedOut).toBe(false);

		// Check /api/me
		const meRes1 = await fetch(`${baseUrl}/api/me`, {
			headers: { "x-telegram-init-data": initData },
		});
		const meData1 = (await meRes1.json()) as {
			isOptedOut: boolean;
			user: { is_opted_out: boolean };
		};
		expect(meData1.isOptedOut).toBe(false);
		expect(meData1.user.is_opted_out).toBe(false);

		// 3. POST toggle to true
		const postRes = await fetch(`${baseUrl}/api/user/opt-out`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-telegram-init-data": initData,
			},
			body: JSON.stringify({ optedOut: true }),
		});
		expect(postRes.status).toBe(200);
		const postData = (await postRes.json()) as {
			success: boolean;
			isOptedOut: boolean;
		};
		expect(postData.success).toBe(true);
		expect(postData.isOptedOut).toBe(true);
		expect(Repository.isUserOptedOut(webUser.id)).toBe(true);

		// Check /api/me reflects true
		const meRes2 = await fetch(`${baseUrl}/api/me`, {
			headers: { "x-telegram-init-data": initData },
		});
		const meData2 = (await meRes2.json()) as {
			isOptedOut: boolean;
			user: { is_opted_out: boolean };
		};
		expect(meData2.isOptedOut).toBe(true);
		expect(meData2.user.is_opted_out).toBe(true);

		// 4. POST toggle back to false
		const postRes2 = await fetch(`${baseUrl}/api/user/opt-out`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-telegram-init-data": initData,
			},
			body: JSON.stringify({ optedOut: false }),
		});
		expect(postRes2.status).toBe(200);
		const postData2 = (await postRes2.json()) as {
			success: boolean;
			isOptedOut: boolean;
		};
		expect(postData2.success).toBe(true);
		expect(postData2.isOptedOut).toBe(false);
		expect(Repository.isUserOptedOut(webUser.id)).toBe(false);

		// Clean up
		Repository.setUserOptOut(webUser.id, false);
	});

	test("Web API: POST /api/memories returns 400 Bad Request when user is opted out", async () => {
		const optedUser = {
			id: 55667788,
			first_name: "OptedOut WebUser",
			username: "opted_web_user",
		};
		const initData = createSignedInitData(optedUser);
		const baseUrl = `http://localhost:${CONFIG.WEB_PORT}`;

		// Opt out the user
		Repository.setUserOptOut(optedUser.id, true);

		const res = await fetch(`${baseUrl}/api/memories`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-telegram-init-data": initData,
			},
			body: JSON.stringify({
				chatId: optedUser.id.toString(),
				memoryText: "Should not be saved",
				category: "PROFILE",
			}),
		});

		expect(res.status).toBe(400);
		const data = (await res.json()) as { error: string };
		expect(data.error).toContain("opted out");

		// Clean up
		Repository.setUserOptOut(optedUser.id, false);
	});
});
