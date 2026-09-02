import { describe, expect, it } from "bun:test";
import type { Context } from "grammy";
import { Repository } from "../src/db/repository";
import { resolveReplyContext } from "../src/modules/chat";
import {
	extractOutgoingPayload,
	saveOutgoingMessage,
} from "../src/services/bot";
import {
	buildHistoryList,
	resolveTargetUserId,
} from "../src/services/gemini/utils";
import { isConversationFollowUp } from "../src/utils/conversation";

describe("Outgoing Message Interceptor & Storage", () => {
	const testChatId = `test_outbound_${Date.now()}`;
	Repository.createChat(testChatId, "Test Outbound Group", 1);

	it("should correctly extract payload from sendMessage with grammY ApiResponse structure", () => {
		const payload = {
			chat_id: testChatId,
			text: "Bu bir bot cevabıdır.",
			reply_parameters: { message_id: 42 },
		};
		// grammY API call returns { ok: true, result: Message }
		const result = {
			ok: true,
			result: {
				message_id: 100,
				date: 1720000000,
				chat: { id: testChatId },
				text: "Bu bir bot cevabıdır.",
				reply_to_message: { message_id: 42 },
			},
		};

		const extracted = extractOutgoingPayload("sendMessage", payload, result);
		expect(extracted).not.toBeNull();
		expect(extracted?.chatId).toBe(testChatId);
		expect(extracted?.msgId).toBe(100);
		expect(extracted?.text).toBe("Bu bir bot cevabıdır.");
		expect(extracted?.sentAt).toBe(1720000000);
		expect(extracted?.replyToMessageId).toBe(42);
	});

	it("should extract payload from editMessageText and outgoing media (sendPhoto, sendDocument)", () => {
		const photoPayload = {
			chat_id: testChatId,
			caption: "Burada grafik var",
			reply_to_message_id: 55,
		};
		const photoResult = {
			ok: true,
			result: {
				message_id: 101,
				date: 1720000010,
				caption: "Burada grafik var",
			},
		};

		const extractedPhoto = extractOutgoingPayload(
			"sendPhoto",
			photoPayload,
			photoResult,
		);
		expect(extractedPhoto).not.toBeNull();
		expect(extractedPhoto?.msgId).toBe(101);
		expect(extractedPhoto?.text).toBe("Burada grafik var");
		expect(extractedPhoto?.replyToMessageId).toBe(55);

		// editMessageText
		const editPayload = {
			chat_id: testChatId,
			message_id: 100,
			text: "Güncellenmiş cevap metni",
		};
		const editResult = {
			ok: true,
			result: {
				message_id: 100,
				date: 1720000020,
				text: "Güncellenmiş cevap metni",
			},
		};

		const extractedEdit = extractOutgoingPayload(
			"editMessageText",
			editPayload,
			editResult,
		);
		expect(extractedEdit).not.toBeNull();
		expect(extractedEdit?.msgId).toBe(100);
		expect(extractedEdit?.text).toBe("Güncellenmiş cevap metni");
	});

	it("should filter out transient tool status messages from being stored as replies", () => {
		const payload = {
			chat_id: testChatId,
			text: "🔍 Searching the web...",
		};
		const result = {
			ok: true,
			result: {
				message_id: 102,
				date: 1720000030,
			},
		};

		const extracted = extractOutgoingPayload("sendMessage", payload, result);
		expect(extracted).toBeNull();
	});

	it("should save outgoing message to SQLite and enable conversation follow-up detection", () => {
		const followUpChat = `test_followup_live_${Date.now()}`;
		const userId = 778899;
		const now = Math.floor(Date.now() / 1000);

		Repository.createChat(followUpChat, "FollowUp Chat", 1);

		// 1. User sends prompt
		Repository.saveMessage({
			chatId: followUpChat,
			messageId: 1,
			userId,
			firstName: "Ahmet",
			text: "Pizza mı makarna mı?",
			sentAt: now - 10,
		});

		// 2. Bot replies via saveOutgoingMessage (as called by interceptor)
		saveOutgoingMessage(
			followUpChat,
			2,
			"Kesinlikle pizza.",
			now - 5,
			1, // reply to message 1
		);

		// Verify bot reply is in DB
		const botDbMsg = Repository.getMessage(followUpChat, 2);
		expect(botDbMsg).not.toBeNull();
		expect(botDbMsg?.is_bot_reply).toBe(1);
		expect(botDbMsg?.text).toBe("Kesinlikle pizza.");
		expect(botDbMsg?.reply_to_message_id).toBe(1);

		// 3. Follow-up detection should be TRUE when user writes again within 45s
		const followUp = isConversationFollowUp(followUpChat, userId, now);
		expect(followUp).toBe(true);

		// A different user should NOT trigger follow-up
		const otherFollowUp = isConversationFollowUp(followUpChat, 999999, now);
		expect(otherFollowUp).toBe(false);
	});
});

describe("Message History Representation & Reply Preview", () => {
	it("should include message_id and resolve reply_to_preview in buildHistoryList", () => {
		const chatHistory = [
			{
				id: 1,
				chat_id: "chat_1",
				message_id: 10,
				user_id: 1001,
				username: "alice",
				first_name: "Alice",
				reply_to_message_id: null,
				text: "Tomorrow let's meet at Kadıköy.",
				photo_file_id: null,
				is_bot_reply: 0,
				sent_at: 1720000000,
			},
			{
				id: 2,
				chat_id: "chat_1",
				message_id: 11,
				user_id: 0,
				username: "ket",
				first_name: "ket.ai",
				reply_to_message_id: 10,
				text: "Kadıköy harika bir seçim!",
				photo_file_id: null,
				is_bot_reply: 1,
				sent_at: 1720000005,
			},
			{
				id: 3,
				chat_id: "chat_1",
				message_id: 12,
				user_id: 1002,
				username: "bob",
				first_name: "Bob",
				reply_to_message_id: 10,
				text: "What time?",
				photo_file_id: null,
				is_bot_reply: 0,
				sent_at: 1720000010,
			},
		];

		const historyList = buildHistoryList(chatHistory, "ket", "chat_1");
		expect(historyList.length).toBe(3);

		// Message 1 (Alice)
		expect(historyList[0].message_id).toBe(10);
		expect(historyList[0].sender).toContain("Alice");
		expect(historyList[0].reply_to_preview).toBeUndefined();

		// Message 2 (Bot reply to Alice)
		expect(historyList[1].message_id).toBe(11);
		expect(historyList[1].sender).toBe("You (ket.ai)");
		expect(historyList[1].reply_to_message_id).toBe(10);
		expect(historyList[1].reply_to_preview).toContain("Alice");

		// Message 3 (Bob reply to Alice)
		expect(historyList[2].message_id).toBe(12);
		expect(historyList[2].sender).toContain("Bob");
		expect(historyList[2].reply_to_message_id).toBe(10);
		expect(historyList[2].reply_to_preview).toContain("Alice");
		expect(historyList[2].reply_to_preview).toContain(
			"Tomorrow let's meet at Kadıköy.",
		);
	});
});

describe("Reply-To Context Extraction", () => {
	it("should extract full context from ctx.message.reply_to_message", () => {
		// Mock Telegram Context
		const mockCtx = {
			message: {
				message_id: 50,
				text: "Neden?",
				reply_to_message: {
					message_id: 49,
					from: {
						id: 0,
						is_bot: true,
						first_name: "ket.ai",
						username: "ket_bot",
					},
					text: "Kesinlikle pizza çünkü hamuru lezzetli.",
				},
			},
		} as unknown as Context;

		const replyCtx = resolveReplyContext(mockCtx, "chat_test");
		expect(replyCtx).toBeDefined();
		expect(replyCtx?.messageId).toBe(49);
		expect(replyCtx?.isBot).toBe(true);
		expect(replyCtx?.senderName).toBe("You (ket.ai)");
		expect(replyCtx?.text).toBe("Kesinlikle pizza çünkü hamuru lezzetli.");
	});
});

describe("Safe Memory Target User Resolution", () => {
	const now = Math.floor(Date.now() / 1000);
	const history = [
		{
			id: 1,
			chat_id: "chat_mem",
			message_id: 201,
			user_id: 501,
			username: "can_berlin",
			first_name: "Can",
			reply_to_message_id: null,
			text: "Selamlar",
			photo_file_id: null,
			is_bot_reply: 0,
			sent_at: now - 30,
		},
	];

	// Save another user into database who is NOT in recent 1 message
	Repository.createChat("chat_mem", "Chat Mem", 1);
	Repository.saveMessage({
		chatId: "chat_mem",
		messageId: 100,
		userId: 602,
		username: "baris_dr",
		firstName: "Barış",
		text: "Eski mesaj",
		sentAt: now - 1000,
	});

	it("should identify self-references and attribute to sender", () => {
		expect(resolveTargetUserId("ben", undefined, history, 501, "Can")).toBe(
			501,
		);
		expect(resolveTargetUserId("kendim", undefined, history, 501, "Can")).toBe(
			501,
		);
		expect(resolveTargetUserId("Can", undefined, history, 501, "Can")).toBe(
			501,
		);
	});

	it("should find another user in history or SQLite users table", () => {
		// Found in history
		expect(resolveTargetUserId("Can", undefined, history, 999, "Zeynep")).toBe(
			501,
		);

		// Found in SQLite users table
		expect(
			resolveTargetUserId("Barış", undefined, history, 999, "Zeynep"),
		).toBe(602);
	});

	it("should NOT pollute speaker profile when an unknown third-party user is mentioned", () => {
		// "Mehmet" does not exist in history or DB.
		// Sender is Zeynep (user_id: 999).
		// Must return null, NOT 999!
		const target = resolveTargetUserId(
			"Mehmet",
			undefined,
			history,
			999,
			"Zeynep",
			"zeynep_user",
		);
		expect(target).toBeNull();
	});
});
