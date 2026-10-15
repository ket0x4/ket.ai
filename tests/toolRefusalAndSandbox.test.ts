import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectGeneratedArtifacts } from "../sandbox/lib/artifacts";
import { runAgentLoop } from "../src/agent/index";
import { codeExecutionTool } from "../src/agent/tools/codeExecution";
import { CONFIG } from "../src/config/index";
import {
	isSandboxConnectionError,
	isSandboxTimeoutError,
} from "../src/sandbox/client";
import { ai } from "../src/services/gemini/client";
import { getSystemInstruction } from "../src/services/gemini/utils";

describe("Sandbox client failure classification", () => {
	test("client timeouts are not reported as connection failures", () => {
		const timeoutErr = Object.assign(
			new Error("Sandbox request exceeded the 50000ms client timeout."),
			{ name: "SandboxTimeoutError" },
		);
		expect(isSandboxTimeoutError(timeoutErr)).toBeTrue();
		expect(isSandboxConnectionError(timeoutErr)).toBeFalse();

		expect(isSandboxConnectionError(new Error("fetch failed"))).toBeTrue();
		expect(isSandboxTimeoutError(new Error("fetch failed"))).toBeFalse();
	});
});

describe("execute_code timeout plumbing", () => {
	test("forwards an explicit timeoutMs to the sandbox request", async () => {
		let captured: { timeoutMs?: number; stream?: boolean } | null = null;
		const server = Bun.serve({
			port: 8097,
			async fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					captured = (await req.json()) as { timeoutMs?: number };
					return Response.json({
						success: true,
						stdout: "ok",
						exitCode: 0,
						executionTimeMs: 5,
						truncated: false,
					});
				}
				return Response.json({ error: "Not found" }, { status: 404 });
			},
		});

		const originalUrl = CONFIG.SANDBOX_URL;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${server.port}`;
		try {
			const result = await codeExecutionTool.execute({
				language: "python",
				code: "print(1)",
				timeoutMs: 9000,
			});
			expect(result.success).toBeTrue();
			const body = captured as { timeoutMs?: number; stream?: boolean } | null;
			expect(body?.timeoutMs).toBe(9000);
			expect(body?.stream).toBe(false);
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			server.stop(true);
		}
	});
});

describe("Oversized artifact handling", () => {
	test("skips oversized files with a note instead of silently dropping them", () => {
		const dir = mkdtempSync(join(tmpdir(), "artifact-test-"));
		try {
			writeFileSync(join(dir, "small.png"), Buffer.from("x"));
			writeFileSync(join(dir, "big.mp4"), Buffer.alloc(11 * 1024 * 1024));

			const notes: string[] = [];
			const artifacts = detectGeneratedArtifacts(
				dir,
				[],
				undefined,
				undefined,
				notes,
			);

			expect(artifacts.some((a) => a.filename === "small.png")).toBeTrue();
			expect(artifacts.some((a) => a.filename === "big.mp4")).toBeFalse();
			expect(notes.some((n) => n.includes("big.mp4"))).toBeTrue();
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Agent loop provider-block handling", () => {
	test("retries once when the provider blocks an empty response", async () => {
		const original = ai.models.generateContent;
		let calls = 0;
		// biome-ignore lint/suspicious/noExplicitAny: Mocking SDK
		(ai.models as any).generateContent = async () => {
			calls++;
			return {
				text: "",
				candidates: [{ finishReason: "SAFETY", content: { role: "model" } }],
				promptFeedback: { blockReason: "SAFETY" },
			};
		};

		try {
			const reply = await runAgentLoop(
				[{ role: "user", parts: [{ text: "hi" }] }],
				{},
				{ traceId: "block_test" },
			);
			expect(reply).toBe("");
			expect(calls).toBe(2);
		} finally {
			ai.models.generateContent = original;
		}
	});
});

describe("System instruction tool advertising", () => {
	test("only advertises enabled tools and omits disabled workspace guidance", () => {
		const webOnly = getSystemInstruction(undefined, ["web_search"]);
		expect(webOnly).toContain("### TOOL AVAILABILITY");
		expect(webOnly).toContain(
			"The only tools you can actually call right now are: `web_search`.",
		);
		expect(webOnly).not.toContain(
			"### WORKSPACE, CODE EXECUTION & AGENTIC BEHAVIOR ###",
		);

		const none = getSystemInstruction(undefined, []);
		expect(none).toContain(
			"The only tools you can actually call right now are: none.",
		);
	});

	test("keeps workspace guidance when no tool list is supplied", () => {
		expect(getSystemInstruction()).toContain(
			"### WORKSPACE, CODE EXECUTION & AGENTIC BEHAVIOR ###",
		);
	});
});
