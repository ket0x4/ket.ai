import { describe, expect, it } from "bun:test";
import { syncToolsWithConfig } from "../src/agent/index";
import { toolRegistry } from "../src/agent/registry";
import { updateBotSettings } from "../src/config";
import { Repository } from "../src/db/repository";
import { isTransientStatusMessage } from "../src/services/bot";
import { cleanUserText } from "../src/services/gemini/utils";
import { isConversationFollowUp } from "../src/utils/conversation";

describe("Transient Status Message Filtering", () => {
	it("should identify all tool status notifications as transient", () => {
		expect(isTransientStatusMessage("🔍 Searching the web...")).toBe(true);
		expect(
			isTransientStatusMessage("⚡ Executing python script in sandbox..."),
		).toBe(true);
		expect(
			isTransientStatusMessage(
				"📦 Installing dependencies (numpy) & running python...",
			),
		).toBe(true);
		expect(
			isTransientStatusMessage("📄 Reading workspace file (main.py)..."),
		).toBe(true);
		expect(
			isTransientStatusMessage("✏️ Writing workspace file (output.txt)..."),
		).toBe(true);
		expect(
			isTransientStatusMessage("📁 Scanning session workspace files..."),
		).toBe(true);
		expect(
			isTransientStatusMessage(
				"🧹 Cleaning and resetting session workspace...",
			),
		).toBe(true);
		expect(
			isTransientStatusMessage("Spawning subagent for (custom_tool)..."),
		).toBe(true);
		expect(
			isTransientStatusMessage(
				"⚡ Running step\n────────────────────────\n> line 1",
			),
		).toBe(true);
	});

	it("should NOT classify regular bot conversation responses as transient", () => {
		expect(isTransientStatusMessage("Hello! How can I help you?")).toBe(false);
		expect(
			isTransientStatusMessage(
				"Here is your calculated answer: ```python\nprint(42)\n```",
			),
		).toBe(false);
		expect(isTransientStatusMessage("")).toBe(false);
	});
});

describe("Dynamic cleanUserText", () => {
	it("should remove default bot nickname 'ket' and mentions without breaking word boundaries", () => {
		expect(cleanUserText("ket selam")).toBe("selam");
		expect(cleanUserText("@ket nasılsın?")).toBe("nasılsın?");
		expect(cleanUserText("bu bir keton bileşiğidir")).toBe(
			"bu bir keton bileşiğidir",
		);
		expect(cleanUserText("market alışverişi")).toBe("market alışverişi");
		expect(cleanUserText("ketum bir tavır")).toBe("ketum bir tavır");
	});

	it("should support dynamic bot usernames", () => {
		expect(cleanUserText("selam @mybot", "mybot")).toBe("selam");
		expect(cleanUserText("mybot hava durumu nasıl", "mybot")).toBe(
			"hava durumu nasıl",
		);
	});
});

describe("Robust Conversation Follow-Up Detection", () => {
	const testChatId = `test_followup_${Date.now()}`;
	const userId1 = 1001;
	const userId2 = 1002;
	const baseTime = Math.floor(Date.now() / 1000);

	it("should detect quick follow-up from same user", () => {
		Repository.createChat(testChatId, "group", 1);
		Repository.saveMessage({
			chatId: testChatId,
			messageId: 1,
			userId: userId1,
			text: "What is 2+2?",
			sentAt: baseTime - 20,
		});
		Repository.saveMessage({
			chatId: testChatId,
			messageId: 2,
			userId: 0,
			text: "It is 4.",
			isBotReply: true,
			sentAt: baseTime - 10,
		});

		// Follow-up within 10s by userId1
		const isFollowUp = isConversationFollowUp(testChatId, userId1, baseTime);
		expect(isFollowUp).toBe(true);

		// Different user should not trigger follow-up
		const otherUserFollowUp = isConversationFollowUp(
			testChatId,
			userId2,
			baseTime,
		);
		expect(otherUserFollowUp).toBe(false);
	});

	it("should handle multi-part bot responses properly", () => {
		const chatMulti = `test_multi_${Date.now()}`;
		Repository.createChat(chatMulti, "group", 1);
		// User sends prompt
		Repository.saveMessage({
			chatId: chatMulti,
			messageId: 10,
			userId: userId1,
			text: "Draw a chart",
			sentAt: baseTime - 20,
		});
		// Bot sends media artifact
		Repository.saveMessage({
			chatId: chatMulti,
			messageId: 11,
			userId: 0,
			text: "[Photo]",
			isBotReply: true,
			sentAt: baseTime - 15,
		});
		// Bot sends text explanation
		Repository.saveMessage({
			chatId: chatMulti,
			messageId: 12,
			userId: 0,
			text: "Here is your chart.",
			isBotReply: true,
			sentAt: baseTime - 10,
		});

		// Follow-up should still find userId1 as the prompter
		const followUp = isConversationFollowUp(chatMulti, userId1, baseTime);
		expect(followUp).toBe(true);
	});

	it("should reject expired follow-ups (> 45s)", () => {
		const isExpired = isConversationFollowUp(
			testChatId,
			userId1,
			baseTime + 100,
		);
		expect(isExpired).toBe(false);
	});
});

describe("Dynamic Tool Registry Sync", () => {
	it("should dynamically enable and disable tools when config updates", () => {
		// Enable both
		updateBotSettings({
			enable_web_search: true,
			enable_code_execution: true,
		});
		syncToolsWithConfig();
		expect(toolRegistry.hasTool("web_search")).toBe(true);
		expect(toolRegistry.hasTool("execute_code")).toBe(true);

		// Disable web search
		updateBotSettings({
			enable_web_search: false,
		});
		expect(toolRegistry.hasTool("web_search")).toBe(false);
		expect(toolRegistry.hasTool("execute_code")).toBe(true);

		// Disable code execution
		updateBotSettings({
			enable_code_execution: false,
		});
		expect(toolRegistry.hasTool("execute_code")).toBe(false);
		expect(toolRegistry.hasTool("read_workspace_file")).toBe(false);

		// Re-enable
		updateBotSettings({
			enable_web_search: true,
			enable_code_execution: true,
		});
		expect(toolRegistry.hasTool("web_search")).toBe(true);
		expect(toolRegistry.hasTool("execute_code")).toBe(true);
	});
});

describe("Single Message Deletion in Repository", () => {
	it("should delete a single message by chat_id and message_id", () => {
		const chatId = `test_del_${Date.now()}`;
		Repository.createChat(chatId, "group", 1);
		Repository.saveMessage({
			chatId,
			messageId: 999,
			userId: 1,
			text: "To be deleted",
			sentAt: 12345,
		});

		expect(Repository.getMessage(chatId, 999)).toBeDefined();

		const deleted = Repository.deleteMessage(chatId, 999);
		expect(deleted).toBe(true);
		expect(Repository.getMessage(chatId, 999)).toBeNull();
	});
});
