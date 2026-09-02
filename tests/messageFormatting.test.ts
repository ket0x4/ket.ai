import { describe, expect, test } from "bun:test";
import type { Context } from "grammy";
import { ai } from "../src/services/gemini/client";
import { GeminiService } from "../src/services/gemini/index";
import { getSystemInstruction } from "../src/services/gemini/utils";
import {
	balanceCodeFences,
	balanceHtmlTags,
	escapeHtml,
	markdownToTelegramHtml,
	sendLongMessage,
	splitMessage,
} from "../src/utils/message";

describe("Markdown Formatting & Message Utility Tests", () => {
	test("escapeHtml escapes &, <, and >", () => {
		expect(escapeHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
	});

	test("markdownToTelegramHtml converts code blocks and inline code", () => {
		const md =
			"Here is Python:\n```python\nprint(10 < 20)\n```\nAnd inline `foo_bar`!";
		const html = markdownToTelegramHtml(md);

		expect(html).toContain(
			'<pre><code class="language-python">print(10 &lt; 20)</code></pre>',
		);
		expect(html).toContain("<code>foo_bar</code>");
	});

	test("markdownToTelegramHtml converts bold, italic, and links", () => {
		const md =
			"This is **bold**, *also bold*, _italic_, ~~strike~~, and [Google](https://google.com).";
		const html = markdownToTelegramHtml(md);

		expect(html).toContain("<b>bold</b>");
		expect(html).toContain("<b>also bold</b>");
		expect(html).toContain("<i>italic</i>");
		expect(html).toContain("<s>strike</s>");
		expect(html).toContain('<a href="https://google.com">Google</a>');
	});

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

	test("balanceHtmlTags balances open <pre> tags across chunks", () => {
		const chunk1 = '<pre><code class="language-python">line1\nline2';
		const chunk2 = "line3</code></pre>";

		const balanced = balanceHtmlTags([chunk1, chunk2]);
		expect(balanced.length).toBe(2);
		expect(balanced[0]).toBe(
			'<pre><code class="language-python">line1\nline2</code></pre>',
		);
		expect(balanced[1]).toBe(
			'<pre><code class="language-python">line3</code></pre>',
		);
	});

	test("balanceCodeFences balances open code fences across chunks", () => {
		const chunk1 = "```python\nprint('hello world')\nx = 10";
		const chunk2 = "y = 20\nprint(x + y)\n```";

		const balanced = balanceCodeFences([chunk1, chunk2]);
		expect(balanced.length).toBe(2);
		expect(balanced[0]).toBe("```python\nprint('hello world')\nx = 10\n```");
		expect(balanced[1]).toBe("```python\ny = 20\nprint(x + y)\n```");
	});

	test("sendLongMessage formats Markdown to Telegram HTML by default", async () => {
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

		expect(sentText).toBe(
			'Here is the code:\n<pre><code class="language-python">print(42)</code></pre>',
		);
		expect(capturedOptions?.parse_mode).toBe("HTML");
	});

	test("sendLongMessage falls back to plain text if Telegram entity parsing fails", async () => {
		const replyAttempts: Array<{ text: string; parse_mode?: string }> = [];

		const mockCtx = {
			reply: async (text: string, options?: { parse_mode?: string }) => {
				replyAttempts.push({ text, parse_mode: options?.parse_mode });
				if (options?.parse_mode === "HTML") {
					throw new Error("400 Bad Request: can't parse entities");
				}
				return { message_id: 456 };
			},
		} as unknown as Context;

		const message = "Plain message with text";
		await sendLongMessage(mockCtx, message);

		expect(replyAttempts.length).toBe(2);
		expect(replyAttempts[0].parse_mode).toBe("HTML");
		expect(replyAttempts[1].parse_mode).toBeUndefined();
		expect(replyAttempts[1].text).toBe(message);
	});

	test("GeminiService preserves Markdown code blocks without stripping backticks", async () => {
		const originalGenerateContent = ai.models.generateContent;
		const markdownResponse =
			"Sonuç:\n```console\n[INFO] 100 items processed\nExit: 0\n```";

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method
		(ai.models as any).generateContent = async () => ({
			text: markdownResponse,
		});

		try {
			const reply = await GeminiService.generateReply(
				[
					{
						id: 1,
						chat_id: "test_chat_formatting",
						user_id: 123,
						text: "run script",
						sent_at: Math.floor(Date.now() / 1000),
					},
				],
				null,
			);

			expect(reply).toBe(markdownResponse);
			expect(reply).toContain("```console");
			expect(reply).toContain("```");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("getSystemInstruction contains Markdown formatting rules", () => {
		const instruction = getSystemInstruction();
		expect(instruction).toContain("### FORMATTING RULE ###");
		expect(instruction).toContain("Markdown code blocks");
		expect(instruction).toContain("Never use emojis");
	});
});
