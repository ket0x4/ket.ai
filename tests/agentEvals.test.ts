import { afterEach, describe, expect, test } from "bun:test";
import {
	type AgentEvent,
	AgentTraceLogger,
	buildStepGuidance,
	compactContents,
	fingerprintToolCall,
	runAgentLoop,
	toolRegistry,
} from "../src/agent/index";
import type { AgentTool } from "../src/agent/types";
import { CONFIG } from "../src/config/index";
import { ai } from "../src/services/gemini/client";

type MockResponse = {
	text?: string;
	candidates?: Array<{ content?: Record<string, unknown> }>;
};

function functionCallResponse(
	name: string,
	args: Record<string, unknown> = {},
	id = "call_1",
): MockResponse {
	return {
		candidates: [
			{
				content: {
					role: "model",
					parts: [{ functionCall: { id, name, args } }],
				},
			},
		],
	};
}

function makeTool(name: string, execute: AgentTool["execute"]): AgentTool {
	return {
		name,
		description: `${name} description`,
		parameters: { type: "OBJECT", properties: {} },
		execute,
	};
}

const originalGenerateContent = ai.models.generateContent;

afterEach(() => {
	ai.models.generateContent = originalGenerateContent;
	AgentTraceLogger.clear();
});

describe("Loop hardening primitives", () => {
	test("fingerprintToolCall is stable across key order", () => {
		expect(fingerprintToolCall({ name: "t", args: { a: 1, b: 2 } })).toBe(
			fingerprintToolCall({ name: "t", args: { b: 2, a: 1 } }),
		);
		expect(fingerprintToolCall({ name: "t", args: { a: 1 } })).not.toBe(
			fingerprintToolCall({ name: "t", args: { a: 2 } }),
		);
	});

	test("compactContents shrinks older tool results and oversized text", () => {
		const big = "X".repeat(9000);
		const contents: Array<Record<string, unknown>> = [
			{ role: "user", parts: [{ text: "task" }] },
			{
				role: "user",
				parts: [
					{
						functionResponse: {
							name: "t",
							response: { result: { stdout: big } },
						},
					},
				],
			},
			{ role: "model", parts: [{ text: "thinking" }] },
			{ role: "user", parts: [{ text: "recent 1" }] },
			{ role: "model", parts: [{ text: "recent 2" }] },
			{ role: "user", parts: [{ text: "recent 3" }] },
			{ role: "model", parts: [{ text: "recent 4" }] },
		];

		const sizeBefore = JSON.stringify(contents).length;
		compactContents(contents, 500, 4);
		const sizeAfter = JSON.stringify(contents).length;

		expect(sizeAfter).toBeLessThan(sizeBefore);
		const compacted = contents[1].parts as Array<Record<string, unknown>>;
		const result = (
			compacted[0].functionResponse as {
				response: { result: { note?: string } };
			}
		).response.result;
		expect(result.note).toContain("compacted");
		// Recent turns are untouched.
		expect((contents[6].parts as Array<{ text: string }>)[0].text).toBe(
			"recent 4",
		);
	});

	test("buildStepGuidance reflects remaining budget and plan", () => {
		const guidance = buildStepGuidance(1, 4, ["fetch data", "plot chart"]);
		expect(guidance).toContain("step 1 of 4");
		expect(guidance).toContain("3 step(s) left");
		expect(guidance).toContain("1. fetch data");
		expect(buildStepGuidance(4, 4)).toContain("final step");
	});
});

describe("Agent loop hardening behavior", () => {
	test("suppresses repeated identical tool calls and terminates cleanly", async () => {
		const originalMaxSteps = CONFIG.MAX_AGENT_STEPS;
		CONFIG.MAX_AGENT_STEPS = 3;

		let executions = 0;
		toolRegistry.register(
			makeTool("sticky_tool", async () => {
				executions++;
				return { ok: true };
			}),
		);

		const events: AgentEvent[] = [];
		let calls = 0;
		// Always asks for the same tool call; the final summary call returns text.
		(ai.models as never as { generateContent: unknown }).generateContent =
			async () => {
				calls++;
				if (calls >= 4) return { text: "final answer" };
				return functionCallResponse("sticky_tool", { value: 1 });
			};

		try {
			const reply = await runAgentLoop(
				[{ role: "user", parts: [{ text: "go" }] }],
				{ systemInstruction: "BASE" },
				{
					traceId: "dup_test",
					sessionId: "dup",
					onEvent: (e) => {
						events.push(e);
					},
				},
			);

			expect(reply).toBe("final answer");
			// MAX_IDENTICAL_TOOL_CALLS defaults to 2 → only 2 real executions.
			expect(executions).toBe(2);
			expect(events.some((e) => e.type === "loop-detected")).toBeTrue();
			expect(
				AgentTraceLogger.getAll("dup_test").some(
					(e) => e.kind === "loop-detected",
				),
			).toBeTrue();
		} finally {
			CONFIG.MAX_AGENT_STEPS = originalMaxSteps;
			toolRegistry.unregister("sticky_tool");
		}
	});

	test("escalates after a tool keeps failing by injecting an agent notice", async () => {
		const originalMaxSteps = CONFIG.MAX_AGENT_STEPS;
		CONFIG.MAX_AGENT_STEPS = 4;

		toolRegistry.register(
			makeTool("boom_tool", async () => {
				throw new Error("always broken");
			}),
		);

		const capturedContents: string[] = [];
		let calls = 0;
		(ai.models as never as { generateContent: unknown }).generateContent =
			async (params: { contents?: unknown }) => {
				calls++;
				capturedContents.push(JSON.stringify(params.contents));
				if (calls >= 4) return { text: "gave up gracefully" };
				return functionCallResponse(
					"boom_tool",
					{ attempt: calls },
					`call_${calls}`,
				);
			};

		try {
			const reply = await runAgentLoop(
				[{ role: "user", parts: [{ text: "go" }] }],
				{ systemInstruction: "BASE" },
				{ traceId: "fail_test", sessionId: "fail" },
			);

			expect(reply).toBe("gave up gracefully");
			const sawNotice = capturedContents.some(
				(c) => c.includes("AGENT NOTICE") && c.includes("failed 3 times"),
			);
			expect(sawNotice).toBeTrue();
		} finally {
			CONFIG.MAX_AGENT_STEPS = originalMaxSteps;
			toolRegistry.unregister("boom_tool");
		}
	});

	test("injects run budget guidance into the per-step system instruction", async () => {
		let capturedInstruction = "";
		(ai.models as never as { generateContent: unknown }).generateContent =
			async (params: { config?: { systemInstruction?: string } }) => {
				capturedInstruction = params.config?.systemInstruction || "";
				return { text: "hi" };
			};

		const reply = await runAgentLoop(
			[{ role: "user", parts: [{ text: "hi" }] }],
			{ systemInstruction: "BASE PERSONA" },
			{ traceId: "budget_test", sessionId: "budget" },
		);

		expect(reply).toBe("hi");
		expect(capturedInstruction).toContain("BASE PERSONA");
		expect(capturedInstruction).toContain("RUN BUDGET");
		expect(capturedInstruction).toContain("step 1 of");
	});

	test("records a step-level trace transcript", async () => {
		toolRegistry.register(makeTool("echo_tool", async () => ({ ok: true })));
		let calls = 0;
		(ai.models as never as { generateContent: unknown }).generateContent =
			async () => {
				calls++;
				if (calls === 1) return functionCallResponse("echo_tool");
				return { text: "done" };
			};

		try {
			await runAgentLoop(
				[{ role: "user", parts: [{ text: "go" }] }],
				{ systemInstruction: "BASE" },
				{ traceId: "trace_test", sessionId: "trace" },
			);

			const trace = AgentTraceLogger.getAll("trace_test");
			expect(trace.some((e) => e.kind === "step-start")).toBeTrue();
			expect(trace.some((e) => e.kind === "step-complete")).toBeTrue();
			expect(trace.some((e) => e.kind === "final")).toBeTrue();
		} finally {
			toolRegistry.unregister("echo_tool");
		}
	});
});
