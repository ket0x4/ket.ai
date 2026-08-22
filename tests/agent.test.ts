import { beforeEach, describe, expect, test } from "bun:test";
import { ToolRegistry as RegistryClass } from "../src/agent/registry";
import { webSearchTool } from "../src/agent/tools/webSearch";
import type { AgentTool } from "../src/agent/types";
import { ai } from "../src/services/gemini/client";
import {
	extractRetryDelayMs,
	GeminiRateLimiter,
	runWithRetry,
} from "../src/services/gemini/utils";

describe("ToolRegistry", () => {
	let registry: RegistryClass;

	beforeEach(() => {
		registry = new RegistryClass();
	});

	test("should register and execute a custom tool", async () => {
		const dummyTool: AgentTool<{ a: number; b: number }, { sum: number }> = {
			name: "add_numbers",
			description: "Adds two numbers together",
			parameters: {
				type: "OBJECT",
				properties: {
					a: { type: "NUMBER", description: "First number" },
					b: { type: "NUMBER", description: "Second number" },
				},
				required: ["a", "b"],
			},
			execute: async ({ a, b }) => ({ sum: a + b }),
		};

		registry.register(dummyTool);
		expect(registry.count).toBe(1);
		expect(registry.hasTool("add_numbers")).toBeTrue();

		const declarations = registry.getFunctionDeclarations();
		expect(declarations.length).toBe(1);
		expect(declarations[0].name).toBe("add_numbers");

		const result = await registry.executeTool("add_numbers", { a: 10, b: 15 });
		expect(result).toEqual({ sum: 25 });
	});

	test("should return error object for unregistered tool execution", async () => {
		const result = await registry.executeTool("non_existent", {});
		expect(result).toHaveProperty("error");
	});

	test("should unregister a tool cleanly", () => {
		const dummyTool: AgentTool = {
			name: "temp_tool",
			description: "Temp",
			parameters: { type: "OBJECT", properties: {} },
			execute: async () => ({}),
		};

		registry.register(dummyTool);
		expect(registry.hasTool("temp_tool")).toBeTrue();
		registry.unregister("temp_tool");
		expect(registry.hasTool("temp_tool")).toBeFalse();
	});
});

describe("WebSearchTool", () => {
	test("should have valid AgentTool metadata", () => {
		expect(webSearchTool.name).toBe("web_search");
		expect(webSearchTool.description).toBeDefined();
		expect(webSearchTool.parameters.properties.query).toBeDefined();
	});

	test("should handle empty query gracefully", async () => {
		const res = await webSearchTool.execute({ query: "   " });
		expect(res.count).toBe(0);
		expect(res.results).toEqual([]);
		expect(res.system_note).toBe("Empty query provided.");
	});

	test("should format grounding chunks into structured search results", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method for unit test
		(ai.models as any).generateContent = async () => ({
			text: "The capital of France is Paris.",
			candidates: [
				{
					groundingMetadata: {
						webSearchQueries: ["capital of France"],
						groundingChunks: [
							{
								web: {
									uri: "https://en.wikipedia.org/wiki/Paris",
									title: "Paris - Wikipedia",
								},
							},
							{
								web: {
									uri: "https://www.france.fr/en/paris",
									title: "Explore Paris",
								},
							},
						],
					},
				},
			],
		});

		try {
			const res = await webSearchTool.execute({ query: "capital of France" });
			expect(res.query).toBe("capital of France");
			expect(res.summary).toBe("The capital of France is Paris.");
			expect(res.count).toBe(2);
			expect(res.results.length).toBe(2);
			expect(res.results[0].title).toBe("Paris - Wikipedia");
			expect(res.results[0].url).toBe("https://en.wikipedia.org/wiki/Paris");
			expect(res.search_queries).toEqual(["capital of France"]);
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("should handle search with summary but no chunks", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method for unit test
		(ai.models as any).generateContent = async () => ({
			text: "Current weather is 22C.",
			candidates: [
				{
					groundingMetadata: {
						webSearchQueries: ["weather"],
						groundingChunks: [],
					},
				},
			],
		});

		try {
			const res = await webSearchTool.execute({ query: "weather" });
			expect(res.query).toBe("weather");
			expect(res.summary).toBe("Current weather is 22C.");
			expect(res.count).toBe(1);
			expect(res.results[0].title).toBe("Google Search Result");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("should handle search errors gracefully", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method for unit test
		(ai.models as any).generateContent = async () => {
			throw new Error("Network timeout");
		};

		try {
			const res = await webSearchTool.execute({ query: "some query" });
			expect(res.count).toBe(0);
			expect(res.results).toEqual([]);
			expect(res.system_note).toBeDefined();
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});
});

describe("SmartRetry", () => {
	test("should extract retryDelay from RetryInfo details object", () => {
		const error = {
			error: {
				code: 429,
				message: "Resource exhausted",
				details: [
					{
						"@type": "type.googleapis.com/google.rpc.RetryInfo",
						retryDelay: "12s",
					},
				],
			},
		};

		const delay = extractRetryDelayMs(error);
		expect(delay).toBe(12500); // 12000ms + 500ms safety buffer
	});

	test("should extract retry delay from text message string", () => {
		const error = new Error(
			"Quota exceeded for metric: limit 5. Please retry in 8.5s.",
		);
		const delay = extractRetryDelayMs(error);
		expect(delay).toBe(9000); // 8500ms + 500ms
	});

	test("should return null when no retry info is present", () => {
		expect(extractRetryDelayMs(new Error("Generic 500 error"))).toBeNull();
		expect(extractRetryDelayMs(null)).toBeNull();
	});

	test("should retry transient errors with runWithRetry", async () => {
		let attempts = 0;
		const result = await runWithRetry(
			async () => {
				attempts++;
				if (attempts < 2) {
					throw new Error("429 RESOURCE_EXHAUSTED");
				}
				return "success";
			},
			3,
			10,
		);

		expect(result).toBe("success");
		expect(attempts).toBe(2);
	});

	test("GeminiRateLimiter should enforce pacing interval between calls", async () => {
		const limiter = new GeminiRateLimiter(50);
		const start = Date.now();
		const t1 = limiter.schedule(async () => 1, 50);
		const t2 = limiter.schedule(async () => 2, 50);
		const results = await Promise.all([t1, t2]);

		expect(results).toEqual([1, 2]);
		expect(Date.now() - start).toBeGreaterThanOrEqual(45);
	});

	test("GeminiRateLimiter should prioritize high priority tasks over low priority tasks", async () => {
		const limiter = new GeminiRateLimiter(10);
		const executionOrder: string[] = [];

		// Task 1 (Low) starts immediately and holds execution for 40ms
		const p1 = limiter.schedule(
			async () => {
				await new Promise((r) => setTimeout(r, 40));
				executionOrder.push("L1");
				return "L1";
			},
			{ priority: "low", customIntervalMs: 10 },
		);

		// Give L1 a tick to start running
		await new Promise((r) => setTimeout(r, 5));

		// Queue L2 and L3 (low priority)
		const p2 = limiter.schedule(
			async () => {
				executionOrder.push("L2");
				return "L2";
			},
			{ priority: "low", customIntervalMs: 10 },
		);

		const p3 = limiter.schedule(
			async () => {
				executionOrder.push("L3");
				return "L3";
			},
			{ priority: "low", customIntervalMs: 10 },
		);

		// Queue H1 (high priority) - should jump ahead of L2 and L3
		const pH1 = limiter.schedule(
			async () => {
				executionOrder.push("H1");
				return "H1";
			},
			{ priority: "high", customIntervalMs: 10 },
		);

		// Queue H2 (high priority) - should jump ahead of L2 and L3 as well
		const pH2 = limiter.schedule(
			async () => {
				executionOrder.push("H2");
				return "H2";
			},
			{ priority: "high", customIntervalMs: 10 },
		);

		expect(limiter.getQueueLength()).toEqual({ high: 2, low: 2, total: 4 });

		await Promise.all([p1, p2, p3, pH1, pH2]);

		// Execution order must be: L1 (already executing), H1, H2, L2, L3
		expect(executionOrder).toEqual(["L1", "H1", "H2", "L2", "L3"]);
		expect(limiter.getQueueLength()).toEqual({ high: 0, low: 0, total: 0 });
	});

	test("GeminiRateLimiter should handle failed tasks without stalling queue", async () => {
		const limiter = new GeminiRateLimiter(5);
		const results: string[] = [];

		const p1 = limiter
			.schedule(
				async () => {
					throw new Error("Task failed");
				},
				{ priority: "high", customIntervalMs: 5 },
			)
			.catch((e) => {
				results.push(`Caught: ${e.message}`);
			});

		const p2 = limiter.schedule(
			async () => {
				results.push("Task 2 success");
				return "ok";
			},
			{ priority: "high", customIntervalMs: 5 },
		);

		await Promise.all([p1, p2]);
		expect(results).toEqual(["Caught: Task failed", "Task 2 success"]);
	});

	test("GeminiRateLimiter clearQueue clears pending queues", async () => {
		const limiter = new GeminiRateLimiter(50);
		// Start a running task
		const p1 = limiter.schedule(
			async () => {
				await new Promise((r) => setTimeout(r, 20));
				return "done";
			},
			{ priority: "high", customIntervalMs: 50 },
		);

		// Queue low and high tasks
		const pLow = limiter
			.schedule(async () => 1, { priority: "low" })
			.catch(() => "cancelled");
		const pHigh = limiter
			.schedule(async () => 2, { priority: "high" })
			.catch(() => "cancelled");

		expect(limiter.getQueueLength().total).toBe(2);
		limiter.clearQueue();
		expect(limiter.getQueueLength().total).toBe(0);

		await Promise.all([p1, pLow, pHigh]);
	});
});

describe("ThinkingConfig and Reply Parsing", () => {
	const { getThinkingConfig } = require("../src/services/gemini/utils");
	const { GeminiService } = require("../src/services/gemini/index");

	test("getThinkingConfig returns proper budget per model", () => {
		expect(getThinkingConfig("gemini-2.5-pro")).toEqual({
			thinkingBudget: 128,
		});
		expect(getThinkingConfig("gemini-2.5-flash")).toEqual({
			thinkingBudget: 0,
		});
		expect(getThinkingConfig("gemini-3.5-pro")).toEqual({
			thinkingLevel: "LOW",
		});
		expect(getThinkingConfig("gemini-3.5-flash-lite")).toEqual({
			thinkingLevel: "MINIMAL",
		});
	});

	function createSingleMessageHistory(text = "Selam") {
		return [
			{
				id: 1,
				chat_id: 12345,
				message_id: 10,
				user_id: 100,
				username: "testuser",
				first_name: "Test",
				text,
				is_bot_reply: false,
				reply_to_message_id: null,
				photo_file_id: null,
				voice_file_id: null,
				created_at: 1000,
			},
		];
	}

	function createImageReplyHistory(replyText: string) {
		return [
			{
				id: 1,
				chat_id: "12345",
				message_id: 10,
				user_id: 100,
				username: "testuser",
				first_name: "Test",
				text: null,
				is_bot_reply: 0,
				reply_to_message_id: null,
				photo_file_id: "file_photo_123",
				sent_at: 1000,
			},
			{
				id: 2,
				chat_id: "12345",
				message_id: 11,
				user_id: 101,
				username: "replier",
				first_name: "Replier",
				text: replyText,
				is_bot_reply: 0,
				reply_to_message_id: 10,
				photo_file_id: null,
				sent_at: 1010,
			},
		];
	}

	const dummyMediaPayload = {
		buffer: Buffer.from("fake_image_bytes"),
		mimeType: "image/jpeg",
	};

	test("GeminiService suppresses reply on broken JSON or stray bracket", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// Mock model returning a single stray brace
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method for unit test
		(ai.models as any).generateContent = async () => ({
			text: "{",
		});

		try {
			const reply = await GeminiService.generateReply(
				createSingleMessageHistory(),
				null,
				false,
				undefined,
				"12345",
			);
			// Should return empty string and suppress sending message
			expect(reply).toBe("");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	test("GeminiService returns valid reply from JSON response", async () => {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method for unit test
		(ai.models as any).generateContent = async () => ({
			text: JSON.stringify({
				reply: "Aleykum selam, nasılsın?",
				new_memory_updates: [],
			}),
		});

		try {
			const reply = await GeminiService.generateReply(
				createSingleMessageHistory(),
				null,
				false,
				undefined,
				"12345",
			);
			expect(reply).toBe("Aleykum selam, nasılsın?");
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});

	async function runImageReplyTest(
		promptText: string,
		mockReply: string,
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK content structure
	): Promise<{ reply: string; capturedContents: any }> {
		const originalGenerateContent = ai.models.generateContent;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK content capture
		let capturedContents: any = null;

		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK method for unit test
		(ai.models as any).generateContent = async (params: any) => {
			capturedContents = params.contents;
			return {
				text: JSON.stringify({
					reply: mockReply,
					new_memory_updates: [],
				}),
			};
		};

		try {
			const reply = await GeminiService.generateReply(
				// biome-ignore lint/suspicious/noExplicitAny: Dummy test history rows
				createImageReplyHistory(promptText) as any,
				null,
				false,
				undefined,
				"12345",
				dummyMediaPayload,
			);
			return { reply, capturedContents };
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	}

	test("GeminiService handles image reply with media buffer and custom question", async () => {
		const { reply, capturedContents } = await runImageReplyTest(
			"ket bu nedir",
			"Bu bir kedi fotoğrafı.",
		);

		expect(reply).toBe("Bu bir kedi fotoğrafı.");
		expect(capturedContents).toBeDefined();
		expect(capturedContents.length).toBe(1);
		expect(capturedContents[0].role).toBe("user");
		expect(capturedContents[0].parts.length).toBe(2);

		const payloadPart = JSON.parse(capturedContents[0].parts[0].text);
		expect(payloadPart.instruction).toContain("attached photo");
		expect(payloadPart.current_message_to_reply.text).toBe("bu nedir");

		const mediaPart = capturedContents[0].parts[1].inlineData;
		expect(mediaPart.mimeType).toBe("image/jpeg");
		expect(mediaPart.data).toBe(
			Buffer.from("fake_image_bytes").toString("base64"),
		);
	});

	test("GeminiService handles image reply when user just says 'ket'", async () => {
		const { reply, capturedContents } = await runImageReplyTest(
			"ket",
			"Harika bir manzara.",
		);

		expect(reply).toBe("Harika bir manzara.");
		const payloadPart = JSON.parse(capturedContents[0].parts[0].text);
		expect(payloadPart.instruction).toContain("attached photo");
		expect(payloadPart.current_message_to_reply.text).toBe("[Photo]");
	});

	test("extractPhotoFileId and Repository.getMessage work correctly", () => {
		const { extractPhotoFileId } = require("../src/utils/mediaDownloader");
		const { Repository } = require("../src/db/repository");

		expect(extractPhotoFileId(undefined)).toBeUndefined();
		expect(extractPhotoFileId([])).toBeUndefined();
		expect(
			extractPhotoFileId([
				{ file_id: "small_123" },
				{ file_id: "medium_456" },
				{ file_id: "large_789" },
			]),
		).toBe("large_789");

		Repository.createChat("test_chat_media_999", "Test Chat", true);
		Repository.saveMessage({
			chatId: "test_chat_media_999",
			messageId: 9991,
			userId: 1234,
			username: "photoman",
			firstName: "Photo Man",
			text: "check this out",
			photoFileId: "photo_large_abc",
			sentAt: Math.floor(Date.now() / 1000),
		});

		const retrieved = Repository.getMessage("test_chat_media_999", 9991);
		expect(retrieved).not.toBeNull();
		expect(retrieved?.photo_file_id).toBe("photo_large_abc");
		expect(retrieved?.text).toBe("check this out");
	});
});
