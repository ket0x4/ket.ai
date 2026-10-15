import { afterEach, describe, expect, test } from "bun:test";
import {
	editWorkspaceFileTool,
	fetchUrlTool,
	searchWorkspaceTool,
	updatePlanTool,
} from "../src/agent/index";
import { htmlToText } from "../src/agent/tools/fetchUrl";
import { CONFIG } from "../src/config/index";

describe("fetch_url", () => {
	test("htmlToText strips tags, scripts and decodes entities", () => {
		const html =
			"<html><head><style>.x{}</style><script>var y=1;</script></head>" +
			"<body><h1>Hello &amp; Welcome</h1><p>Line one</p><p>Line&#39; two</p></body></html>";
		const text = htmlToText(html);
		expect(text).toContain("Hello & Welcome");
		expect(text).toContain("Line one");
		expect(text).toContain("Line' two");
		expect(text).not.toContain("var y=1");
		expect(text).not.toContain("<h1>");
	});

	test("fetches a page and returns readable text", async () => {
		const server = Bun.serve({
			port: 0,
			fetch() {
				return new Response("<html><body><p>Alpha Beta</p></body></html>", {
					headers: { "content-type": "text/html; charset=utf-8" },
				});
			},
		});

		try {
			const res = await fetchUrlTool.execute({
				url: `http://127.0.0.1:${server.port}/`,
			});
			expect(res.success).toBeTrue();
			expect(res.status).toBe(200);
			expect(res.text).toContain("Alpha Beta");
		} finally {
			server.stop(true);
		}
	});

	test("rejects non-http protocols and empty URLs", async () => {
		const bad = await fetchUrlTool.execute({ url: "file:///etc/passwd" });
		expect(bad.success).toBeFalse();
		expect(bad.system_note).toContain("http");

		const empty = await fetchUrlTool.execute({ url: "  " });
		expect(empty.success).toBeFalse();
	});
});

describe("update_plan", () => {
	test("records, updates, and clears a per-session plan", async () => {
		const context = { sessionId: "plan_session_1" };
		const set = await updatePlanTool.execute(
			{ items: ["step a", "step b"] },
			context,
		);
		expect(set.success).toBeTrue();
		expect(set.plan).toEqual(["step a", "step b"]);

		const cleared = await updatePlanTool.execute({ items: [] }, context);
		expect(cleared.plan).toEqual([]);

		const isolated = await updatePlanTool.execute(
			{ items: ["other"] },
			{ sessionId: "plan_session_2" },
		);
		expect(isolated.plan).toEqual(["other"]);
	});
});

describe("workspace search & edit (mock sandbox)", () => {
	let server: ReturnType<typeof Bun.serve> | undefined;
	const originalUrl = CONFIG.SANDBOX_URL;

	function startMockSandbox() {
		const files = new Map<string, string>([
			["app.py", "import os\nprint('hello world')\n"],
			["notes.txt", "hello world again\n"],
			["dup.txt", "aaa\nbbb\naaa\n"],
		]);

		const srv = Bun.serve({
			port: 0,
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: simple test mock router
			async fetch(req) {
				const url = new URL(req.url);
				const body = (await req.json()) as Record<string, unknown>;
				if (url.pathname === "/workspace/read") {
					const name = body.filename as string;
					if (!files.has(name)) {
						return Response.json(
							{ success: false, error: "not found" },
							{ status: 404 },
						);
					}
					return Response.json({
						success: true,
						filename: name,
						content: files.get(name),
						sizeBytes: (files.get(name) || "").length,
					});
				}
				if (url.pathname === "/workspace/write") {
					files.set(body.filename as string, body.content as string);
					return Response.json({ success: true, filename: body.filename });
				}
				if (url.pathname === "/workspace/search") {
					const needle = String(body.query).toLowerCase();
					const matches: Array<{
						filename: string;
						line: number;
						text: string;
					}> = [];
					for (const [filename, content] of files) {
						content.split("\n").forEach((line, i) => {
							if (line.toLowerCase().includes(needle)) {
								matches.push({ filename, line: i + 1, text: line });
							}
						});
					}
					return Response.json({
						success: true,
						matches,
						totalMatches: matches.length,
						filesSearched: files.size,
					});
				}
				return Response.json({ error: "not found" }, { status: 404 });
			},
		});
		server = srv;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${srv.port}`;
	}

	afterEach(() => {
		CONFIG.SANDBOX_URL = originalUrl;
		server?.stop(true);
		server = undefined;
	});

	test("search_workspace returns matching files and lines", async () => {
		startMockSandbox();
		const res = await searchWorkspaceTool.execute(
			{ query: "hello world" },
			{ sessionId: "ws1" },
		);
		expect(res.success).toBeTrue();
		expect(res.matches.length).toBe(2);
		expect(res.matches[0].filename).toBe("app.py");
		expect(res.matches[0].line).toBe(2);
	});

	test("edit_workspace_file applies a unique replacement", async () => {
		startMockSandbox();
		const res = await editWorkspaceFileTool.execute(
			{
				filename: "app.py",
				old_string: "print('hello world')",
				new_string: "print('goodbye world')",
			},
			{ sessionId: "ws1" },
		);
		expect(res.success).toBeTrue();
		expect(res.replacements).toBe(1);
	});

	test("edit_workspace_file rejects a missing or ambiguous snippet", async () => {
		startMockSandbox();
		const missing = await editWorkspaceFileTool.execute(
			{ filename: "app.py", old_string: "does-not-exist", new_string: "x" },
			{ sessionId: "ws1" },
		);
		expect(missing.success).toBeFalse();
		expect(missing.system_note).toContain("not found");

		const ambiguous = await editWorkspaceFileTool.execute(
			{ filename: "dup.txt", old_string: "aaa", new_string: "hi" },
			{ sessionId: "ws1" },
		);
		expect(ambiguous.success).toBeFalse();
		expect(ambiguous.system_note).toContain("Ambiguous");

		const replaceAll = await editWorkspaceFileTool.execute(
			{
				filename: "dup.txt",
				old_string: "aaa",
				new_string: "hi",
				replace_all: true,
			},
			{ sessionId: "ws1" },
		);
		expect(replaceAll.success).toBeTrue();
		expect(replaceAll.replacements).toBe(2);
	});
});
