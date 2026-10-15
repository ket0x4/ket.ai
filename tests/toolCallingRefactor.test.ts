import { describe, expect, test } from "bun:test";
import {
	type AgentEvent,
	executeFunctionCallsInParallel,
	mergeAgentEventHandlers,
	runAgentLoop,
	toolRegistry,
} from "../src/agent/index";
import { ToolRegistry } from "../src/agent/registry";
import type { AgentTool } from "../src/agent/types";
import { ai } from "../src/services/gemini/client";

function makeTool(name: string, overrides: Partial<AgentTool> = {}): AgentTool {
	return {
		name,
		description: `${name} description`,
		parameters: { type: "OBJECT", properties: {} },
		execute: async () => ({ ok: true }),
		...overrides,
	};
}

describe("ToolRegistry enablement metadata", () => {
	test("disabled tools are hidden from listing and rejected by execution", async () => {
		const registry = new ToolRegistry();
		registry.register(makeTool("disabled_tool", { isEnabled: () => false }));
		registry.register(makeTool("enabled_tool", { isEnabled: () => true }));
		registry.register(makeTool("default_tool"));

		expect(registry.isEnabled("disabled_tool")).toBeFalse();
		expect(registry.hasTool("disabled_tool")).toBeFalse();
		expect(registry.getTool("disabled_tool")).toBeUndefined();

		const names = registry
			.getAllTools()
			.map((t) => t.name)
			.sort();
		expect(names).toEqual(["default_tool", "enabled_tool"]);
		expect(registry.count).toBe(2);
		expect(registry.getFunctionDeclarations().map((d) => d.name)).not.toContain(
			"disabled_tool",
		);

		const result = (await registry.executeTool("disabled_tool", {})) as {
			error?: string;
		};
		expect(result.error).toContain("disabled");
	});

	test("enablement is re-evaluated on every access", () => {
		const registry = new ToolRegistry();
		let enabled = false;
		registry.register(makeTool("toggle_tool", { isEnabled: () => enabled }));

		expect(registry.hasTool("toggle_tool")).toBeFalse();
		enabled = true;
		expect(registry.hasTool("toggle_tool")).toBeTrue();
	});
});

describe("Consolidated agent events", () => {
	test("routes tool-call, tool-progress, and media-generated through one handler", async () => {
		const events: AgentEvent[] = [];
		const progressTool = makeTool("progress_tool", {
			execute: async (_args, context) => {
				context?.onProgress?.({ type: "status", statusText: "working" });
				context?.emitArtifact?.({
					filename: "chart.png",
					mimeType: "image/png",
					buffer: Buffer.from("x"),
					type: "image",
					sizeBytes: 1,
				});
				return { ok: true };
			},
		});
		toolRegistry.register(progressTool);

		try {
			const parts = await executeFunctionCallsInParallel(
				[{ id: "c1", name: "progress_tool", args: {} }],
				{
					chatId: "chat",
					traceId: "trace",
					onEvent: (event) => {
						events.push(event);
					},
				},
				3,
			);

			expect(parts.length).toBe(1);
			const call = events.find((e) => e.type === "tool-call");
			expect(call).toMatchObject({
				type: "tool-call",
				toolName: "progress_tool",
				step: 3,
			});

			const progress = events.find((e) => e.type === "tool-progress");
			expect(
				progress?.type === "tool-progress" && progress.progress.statusText,
			).toBe("working");

			const media = events.filter((e) => e.type === "media-generated");
			expect(media.length).toBe(1);
		} finally {
			toolRegistry.unregister("progress_tool");
		}
	});

	test("a throwing handler does not block later handlers", async () => {
		const seen: string[] = [];
		const merged = mergeAgentEventHandlers(
			() => {
				throw new Error("boom");
			},
			(event) => {
				seen.push(event.type);
			},
		);

		await merged({ type: "tool-call", toolName: "x", args: {}, step: 1 });
		expect(seen).toEqual(["tool-call"]);
	});
});

describe("runAgentLoop cancellation", () => {
	test("returns immediately without calling the model when already aborted", async () => {
		const original = ai.models.generateContent;
		let calls = 0;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK
		(ai.models as any).generateContent = async () => {
			calls++;
			return { text: "hi" };
		};

		try {
			const controller = new AbortController();
			controller.abort();

			const reply = await runAgentLoop(
				[{ role: "user", parts: [{ text: "hi" }] }],
				{},
				{ signal: controller.signal, traceId: "abort_test" },
			);

			expect(reply).toBe("");
			expect(calls).toBe(0);
		} finally {
			ai.models.generateContent = original;
		}
	});
});
