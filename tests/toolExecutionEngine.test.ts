import { describe, expect, test } from "bun:test";
import {
	executeFunctionCallsInParallel,
	executeSingleToolCall,
	extractFunctionCalls,
	sanitizeToolResultForLLM,
	smartTruncateText,
	validateToolArguments,
	webSearchTool,
} from "../src/agent/index";
import type { AgentTool } from "../src/agent/types";
import { ai } from "../src/services/gemini/client";

describe("Tool Argument Validator", () => {
	const testSchema = {
		type: "OBJECT" as const,
		properties: {
			name: { type: "STRING" as const, description: "User name" },
			count: { type: "INTEGER" as const, description: "Count" },
			ratio: { type: "NUMBER" as const, description: "Ratio" },
			active: { type: "BOOLEAN" as const, description: "Is active" },
			tags: {
				type: "ARRAY" as const,
				description: "Tags",
				items: { type: "STRING" as const },
			},
		},
		required: ["name", "count"],
	};

	test("passes on valid arguments", () => {
		const result = validateToolArguments(
			{ name: "John", count: 5, ratio: 3.14, active: true, tags: ["a", "b"] },
			testSchema,
		);
		expect(result.valid).toBeTrue();
		expect(result.error).toBeUndefined();
	});

	test("fails when required parameter is missing", () => {
		const result = validateToolArguments({ count: 5 }, testSchema);
		expect(result.valid).toBeFalse();
		expect(result.error).toContain("Missing required parameter 'name'");
	});

	test("fails when parameter type is incorrect", () => {
		const result = validateToolArguments(
			{ name: "John", count: "five" as unknown as number },
			testSchema,
		);
		expect(result.valid).toBeFalse();
		expect(result.error).toContain("Invalid type for parameter 'count'");
	});

	test("fails when array item type is incorrect", () => {
		const result = validateToolArguments(
			{ name: "John", count: 1, tags: [123, 456] as unknown as string[] },
			testSchema,
		);
		expect(result.valid).toBeFalse();
		expect(result.error).toContain("Invalid item type in array 'tags'");
	});
});

describe("Output Sanitization & Smart Truncation", () => {
	test("does not truncate small outputs", () => {
		const smallText = "Hello world line 1\nHello world line 2";
		const { text, truncated } = smartTruncateText(smallText);
		expect(truncated).toBeFalse();
		expect(text).toBe(smallText);
	});

	test("truncates outputs with excessive lines preserving head and tail", () => {
		const lines = Array.from(
			{ length: 300 },
			(_, i) => `Line ${i + 1}: Some content here`,
		);
		const giantText = lines.join("\n");
		const { text, truncated } = smartTruncateText(giantText);

		expect(truncated).toBeTrue();
		expect(text).toContain("Line 1:");
		expect(text).toContain("Line 50:");
		expect(text).toContain("Truncated 225 lines");
		expect(text).toContain("Line 300:");
	});

	test("truncates outputs with excessive character count", () => {
		const longString = "A".repeat(12000);
		const { text, truncated } = smartTruncateText(longString);

		expect(truncated).toBeTrue();
		expect(text).toContain("Truncated");
		expect(text.length).toBeLessThan(12000);
	});

	test("sanitizes tool object stdout, stderr, and content", () => {
		const rawToolResult = {
			stdout: Array.from({ length: 250 }, (_, i) => `stdout line ${i}`).join(
				"\n",
			),
			stderr: Array.from({ length: 200 }, (_, i) => `stderr line ${i}`).join(
				"\n",
			),
			content: Array.from(
				{ length: 200 },
				(_, i) => `file content line ${i}`,
			).join("\n"),
		};

		const sanitized = sanitizeToolResultForLLM(rawToolResult) as Record<
			string,
			unknown
		>;
		expect(sanitized.truncated).toBeTrue();
		expect(typeof sanitized.stdout).toBe("string");
		expect(sanitized.stdout as string).toContain("Truncated");
		expect(sanitized.stderr as string).toContain("Truncated");
		expect(sanitized.content as string).toContain("Truncated");
	});
});

describe("Parallel Tool Execution Engine", () => {
	test("executes multiple tool calls in parallel with isolated execution contexts", async () => {
		const executionOrder: string[] = [];
		const startTimes: number[] = [];

		const slowToolA: AgentTool<
			{ delay: number; tag: string },
			{ result: string }
		> = {
			name: "slow_tool_a",
			description: "Slow tool A",
			parameters: {
				type: "OBJECT",
				properties: {
					delay: { type: "NUMBER" },
					tag: { type: "STRING" },
				},
				required: ["delay", "tag"],
			},
			execute: async (args) => {
				startTimes.push(Date.now());
				await new Promise((r) => setTimeout(r, args.delay));
				executionOrder.push(args.tag);
				return { result: `done_${args.tag}` };
			},
		};

		const slowToolB: AgentTool<
			{ delay: number; tag: string },
			{ result: string }
		> = {
			name: "slow_tool_b",
			description: "Slow tool B",
			parameters: {
				type: "OBJECT",
				properties: {
					delay: { type: "NUMBER" },
					tag: { type: "STRING" },
				},
				required: ["delay", "tag"],
			},
			execute: async (args) => {
				startTimes.push(Date.now());
				await new Promise((r) => setTimeout(r, args.delay));
				executionOrder.push(args.tag);
				return { result: `done_${args.tag}` };
			},
		};

		// Register in global tool registry for executor
		const { toolRegistry } = await import("../src/agent/registry");
		toolRegistry.register(slowToolA);
		toolRegistry.register(slowToolB);

		try {
			const startTotal = Date.now();
			const results = await executeFunctionCallsInParallel(
				[
					{ id: "call_1", name: "slow_tool_a", args: { delay: 60, tag: "A" } },
					{ id: "call_2", name: "slow_tool_b", args: { delay: 30, tag: "B" } },
				],
				{ chatId: "test_chat", traceId: "test_trace" },
				1,
			);
			const totalTime = Date.now() - startTotal;

			// Because they ran in parallel, total time should be ~60ms (not 60+30=90ms)
			expect(totalTime).toBeLessThan(85);

			// B finishes before A because it has 30ms delay vs 60ms
			expect(executionOrder).toEqual(["B", "A"]);

			// Function response parts must preserve original order (call_1 first, call_2 second)
			expect(results.length).toBe(2);
			// biome-ignore lint/suspicious/noExplicitAny: FunctionResponse shape check
			const resp1 = (results[0] as any).functionResponse;
			// biome-ignore lint/suspicious/noExplicitAny: FunctionResponse shape check
			const resp2 = (results[1] as any).functionResponse;

			expect(resp1.id).toBe("call_1");
			expect(resp1.name).toBe("slow_tool_a");
			expect(resp1.response.result.result).toBe("done_A");

			expect(resp2.id).toBe("call_2");
			expect(resp2.name).toBe("slow_tool_b");
			expect(resp2.response.result.result).toBe("done_B");
		} finally {
			const { toolRegistry } = await import("../src/agent/registry");
			toolRegistry.unregister("slow_tool_a");
			toolRegistry.unregister("slow_tool_b");
		}
	});

	test("isolates single tool failure without failing other parallel tool executions", async () => {
		const failingTool: AgentTool = {
			name: "failing_tool",
			description: "Fails intentionally",
			parameters: { type: "OBJECT", properties: {} },
			execute: async () => {
				throw new Error("Disk crashed");
			},
		};

		const healthyTool: AgentTool = {
			name: "healthy_tool",
			description: "Healthy tool",
			parameters: { type: "OBJECT", properties: {} },
			execute: async () => ({ status: "ok" }),
		};

		const { toolRegistry } = await import("../src/agent/registry");
		toolRegistry.register(failingTool);
		toolRegistry.register(healthyTool);

		try {
			const results = await executeFunctionCallsInParallel(
				[
					{ id: "call_fail", name: "failing_tool", args: {} },
					{ id: "call_ok", name: "healthy_tool", args: {} },
				],
				{ chatId: "test_chat", traceId: "test_trace" },
				1,
			);

			expect(results.length).toBe(2);
			// biome-ignore lint/suspicious/noExplicitAny: FunctionResponse check
			const resFail = (results[0] as any).functionResponse;
			// biome-ignore lint/suspicious/noExplicitAny: FunctionResponse check
			const resOk = (results[1] as any).functionResponse;

			expect(resFail.id).toBe("call_fail");
			expect(resFail.response.result.error).toContain("Disk crashed");

			expect(resOk.id).toBe("call_ok");
			expect(resOk.response.result).toEqual({ status: "ok" });
		} finally {
			const { toolRegistry } = await import("../src/agent/registry");
			toolRegistry.unregister("failing_tool");
			toolRegistry.unregister("healthy_tool");
		}
	});

	test("validates parameters in executeSingleToolCall and returns validation error to LLM", async () => {
		const strictTool: AgentTool<{ email: string }> = {
			name: "strict_tool",
			description: "Strict parameter tool",
			parameters: {
				type: "OBJECT",
				properties: {
					email: { type: "STRING" },
				},
				required: ["email"],
			},
			execute: async (args) => ({ sentTo: args.email }),
		};

		const { toolRegistry } = await import("../src/agent/registry");
		toolRegistry.register(strictTool);

		try {
			// Call without required 'email'
			const res = await executeSingleToolCall(
				{ id: "call_invalid", name: "strict_tool", args: {} },
				{ traceId: "test_trace" },
			);

			// biome-ignore lint/suspicious/noExplicitAny: FunctionResponse check
			const funcResp = (res as any).functionResponse;
			expect(funcResp.id).toBe("call_invalid");
			expect(funcResp.response.result.error).toContain(
				"Missing required parameter 'email'",
			);
		} finally {
			const { toolRegistry } = await import("../src/agent/registry");
			toolRegistry.unregister("strict_tool");
		}
	});

	test("extractFunctionCalls handles candidate content parts and functionCalls root property", () => {
		const responseFromCandidates = {
			candidates: [
				{
					content: {
						parts: [
							{
								functionCall: {
									id: "call_abc",
									name: "read_workspace_file",
									args: { filename: "main.py" },
								},
							},
						],
					},
				},
			],
		};

		const extracted = extractFunctionCalls(responseFromCandidates);
		expect(extracted.length).toBe(1);
		expect(extracted[0].name).toBe("read_workspace_file");
		expect(extracted[0].id).toBe("call_abc");
		expect(extracted[0].args?.filename).toBe("main.py");
	});
});

describe("WebSearch In-Memory Caching", () => {
	test("serves cached search results on repeated queries", async () => {
		let callCount = 0;
		const originalGenerateContent = ai.models.generateContent;

		// biome-ignore lint/suspicious/noExplicitAny: Mock SDK
		(ai.models as any).generateContent = async () => {
			callCount++;
			return {
				text: "Istanbul is the largest city in Turkey.",
				candidates: [
					{
						groundingMetadata: {
							webSearchQueries: ["istanbul largest city"],
							groundingChunks: [
								{
									web: {
										uri: "https://en.wikipedia.org/wiki/Istanbul",
										title: "Istanbul - Wikipedia",
									},
								},
							],
						},
					},
				],
			};
		};

		try {
			const res1 = await webSearchTool.execute({
				query: "Istanbul Population",
			});
			expect(res1.summary).toContain("Istanbul is the largest city");
			expect(callCount).toBe(1);

			// Repeated query with different casing and whitespace
			const res2 = await webSearchTool.execute({
				query: "  istanbul population  ",
			});
			expect(res2.summary).toContain("Istanbul is the largest city");
			expect(res2.cached).toBeTrue();
			// No second Gemini API call made!
			expect(callCount).toBe(1);
		} finally {
			ai.models.generateContent = originalGenerateContent;
		}
	});
});
