import { describe, expect, test } from "bun:test";
import type { Context } from "grammy";
import { getSystemInstruction } from "../src/services/gemini/utils";
import {
	balanceCodeFences,
	sendLongMessage,
	splitMessage,
} from "../src/utils/message";

describe("Markdown Formatting & Message Utility Tests", () => {
	test("splitMessage splits long text properly", () => {
		expect(splitMessage("")).toEqual([]);
		expect(splitMessage("   ")).toEqual([]);

		const shortText = "Hello Telegram!";
		expect(splitMessage(shortText)).toEqual([shortText]);

		const longText = `${"A".repeat(3000)}\n\n${"B".repeat(2000)}`;
		const chunks = splitMessage(longText);
		expect(chunks.length).toBe(2);
		expect(chunks[0].length).toBeLessThanOrEqual(4096);
		expect(chunks[1].length).toBeLessThanOrEqual(4096);
	});

	test("balanceCodeFences balances open code fences across chunks", () => {
		const chunk1 = "```python\nprint('hello world')\nx = 10";
		const chunk2 = "y = 20\nprint(x + y)\n```";

		const balanced = balanceCodeFences([chunk1, chunk2]);
		expect(balanced.length).toBe(2);
		// First chunk should close the fence
		expect(balanced[0]).toBe("```python\nprint('hello world')\nx = 10\n```");
		// Second chunk should reopen with python language
		expect(balanced[1]).toBe("```python\ny = 20\nprint(x + y)\n```");
	});

	test("balanceCodeFences leaves already balanced chunks intact", () => {
		const chunk1 = "```bash\necho 123\n```";
		const chunk2 = "Normal text message without code blocks.";
		const balanced = balanceCodeFences([chunk1, chunk2]);

		expect(balanced[0]).toBe(chunk1);
		expect(balanced[1]).toBe(chunk2);
	});

	test("sendLongMessage sends with Markdown parse_mode by default", async () => {
		let capturedOptions: Record<string, unknown> | undefined;
		let sentText = "";

		const mockCtx = {
			reply: async (text: string, options?: Record<string, unknown>) => {
				sentText = text;
				capturedOptions = options;
				return { message_id: 123 };
			},
		} as unknown as Context;

		const message = "Here is the code:\n```python\nprint(42)\n```";
		await sendLongMessage(mockCtx, message);

		expect(sentText).toBe(message);
		expect(capturedOptions?.parse_mode).toBe("Markdown");
	});

	test("sendLongMessage falls back to plain text if Markdown entity parsing fails", async () => {
		const replyAttempts: Array<{ text: string; parse_mode?: string }> = [];

		const mockCtx = {
			reply: async (text: string, options?: { parse_mode?: string }) => {
				replyAttempts.push({ text, parse_mode: options?.parse_mode });
				if (options?.parse_mode === "Markdown") {
					throw new Error(
						"400 Bad Request: can't parse entities: can't find end of italic entity",
					);
				}
				return { message_id: 456 };
			},
		} as unknown as Context;

		const brokenMarkdown =
			"This has broken markdown _variable_name without close";
		await sendLongMessage(mockCtx, brokenMarkdown);

		expect(replyAttempts.length).toBe(2);
		expect(replyAttempts[0].parse_mode).toBe("Markdown");
		expect(replyAttempts[1].parse_mode).toBeUndefined();
	});

	test("sendLongMessage respects explicit parse_mode override", async () => {
		let capturedOptions: Record<string, unknown> | undefined;

		const mockCtx = {
			reply: async (_text: string, options?: Record<string, unknown>) => {
				capturedOptions = options;
				return { message_id: 789 };
			},
		} as unknown as Context;

		await sendLongMessage(mockCtx, "<b>Bold text</b>", {
			parse_mode: "HTML",
		});

		expect(capturedOptions?.parse_mode).toBe("HTML");
	});

	test("getSystemInstruction contains Markdown formatting rules", () => {
		const instruction = getSystemInstruction();
		expect(instruction).toContain("### FORMATTING RULE ###");
		expect(instruction).toContain("Markdown code blocks");
		expect(instruction).toContain("Never use emojis");
	});
});
