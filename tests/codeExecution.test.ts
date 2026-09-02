import { describe, expect, test } from "bun:test";
import { toolRegistry } from "../src/agent/index";
import {
	codeExecutionTool,
	executeInSandbox,
} from "../src/agent/tools/codeExecution";
import { CONFIG } from "../src/config/index";

describe("CodeExecutionTool", () => {
	test("should have valid AgentTool metadata and parameter schemas", () => {
		expect(codeExecutionTool.name).toBe("execute_code");
		expect(codeExecutionTool.description).toBeDefined();
		expect(codeExecutionTool.parameters.type).toBe("OBJECT");
		expect(codeExecutionTool.parameters.properties.language).toBeDefined();
		expect(codeExecutionTool.parameters.properties.code).toBeDefined();
		expect(codeExecutionTool.parameters.properties.packages).toBeDefined();
		expect(codeExecutionTool.parameters.properties.target_files).toBeDefined();
		expect(codeExecutionTool.parameters.required).toEqual(["language", "code"]);
	});

	test("should be registered in toolRegistry", () => {
		expect(toolRegistry.hasTool("execute_code")).toBeTrue();
		const tool = toolRegistry.getTool("execute_code");
		expect(tool).toBeDefined();
		expect(tool?.name).toBe("execute_code");
	});

	test("should handle empty code string gracefully", async () => {
		const result = await executeInSandbox({
			language: "python",
			code: "   ",
		});
		expect(result.success).toBeFalse();
		expect(result.exit_code).toBe(1);
		expect(result.error).toBe("Empty code string.");
	});

	test("should handle unreachable sandbox gracefully", async () => {
		const originalUrl = CONFIG.SANDBOX_URL;
		// Point to non-existent local port
		CONFIG.SANDBOX_URL = "http://127.0.0.1:59999";

		try {
			const result = await executeInSandbox({
				language: "python",
				code: "print('Hello world')",
			});
			expect(result.success).toBeFalse();
			expect(result.error).toContain("unreachable");
			expect(result.system_note).toBeDefined();
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
		}
	});

	test("should successfully communicate with mock sandbox server", async () => {
		const mockServer = Bun.serve({
			port: 8089,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					return Response.json({
						success: true,
						stdout:
							"Top Seller Books:\n1. Atomic Habits\n2. The Psychology of Money",
						stderr: "",
						exitCode: 0,
						executionTimeMs: 145,
						installedPackages: ["requests", "beautifulsoup4"],
						truncated: false,
					});
				}
				return Response.json({ error: "Not found" }, { status: 404 });
			},
		});

		const originalUrl = CONFIG.SANDBOX_URL;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${mockServer.port}`;

		try {
			const result = await codeExecutionTool.execute({
				language: "python",
				code: `
import requests
from bs4 import BeautifulSoup
print("Top Seller Books:\n1. Atomic Habits\n2. The Psychology of Money")
`,
				packages: ["requests", "beautifulsoup4"],
			});

			expect(result.success).toBeTrue();
			expect(result.stdout).toContain("Atomic Habits");
			expect(result.exit_code).toBe(0);
			expect(result.installed_packages).toEqual(["requests", "beautifulsoup4"]);
			expect(result.system_note).toContain("succeeded");
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			mockServer.stop(true);
		}
	});

	test("should handle sandbox execution errors (non-zero exit code) and extract hints", async () => {
		const mockServer = Bun.serve({
			port: 8091,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					return Response.json({
						success: false,
						stdout: "",
						stderr: "ModuleNotFoundError: No module named 'nonexistent_lib'",
						errorHint:
							"Hint: Python module 'nonexistent_lib' is missing. You can pass packages: ['nonexistent_lib'] in your tool arguments to auto-install it.",
						exitCode: 1,
						executionTimeMs: 80,
						truncated: false,
					});
				}
				return Response.json({ error: "Not found" }, { status: 404 });
			},
		});

		const originalUrl = CONFIG.SANDBOX_URL;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${mockServer.port}`;

		try {
			const result = await codeExecutionTool.execute({
				language: "python",
				code: "import nonexistent_lib",
			});

			expect(result.success).toBeFalse();
			expect(result.exit_code).toBe(1);
			expect(result.stderr).toContain("ModuleNotFoundError");
			expect(result.error_hint).toContain("nonexistent_lib");
			expect(result.system_note).toContain(
				"Hint: Python module 'nonexistent_lib' is missing",
			);
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			mockServer.stop(true);
		}
	});

	test("should parse generated image artifacts and update system_note", async () => {
		const mockServer = Bun.serve({
			port: 8092,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					return Response.json({
						success: true,
						stdout: "Plot generated successfully",
						stderr: "",
						exitCode: 0,
						executionTimeMs: 210,
						images: [
							{
								filename: "chart.png",
								mimeType: "image/png",
								data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
								sizeBytes: 68,
								type: "image",
							},
						],
						truncated: false,
					});
				}
				return Response.json({ error: "Not found" }, { status: 404 });
			},
		});

		const originalUrl = CONFIG.SANDBOX_URL;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${mockServer.port}`;

		try {
			const result = await codeExecutionTool.execute({
				language: "python",
				code: "import matplotlib.pyplot as plt\nplt.savefig('chart.png')",
			});

			expect(result.success).toBeTrue();
			expect(result.images).toBeDefined();
			expect(result.images?.length).toBe(1);
			expect(result.images?.[0].filename).toBe("chart.png");
			expect(result.images?.[0].mimeType).toBe("image/png");
			expect(result.system_note).toContain("chart.png");
			expect(result.system_note).toContain(
				"automatically delivered/displayed to the user",
			);
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			mockServer.stop(true);
		}
	});

	test("should parse multiple rich artifacts (Excel, PDF, CSV, Video) and include in system_note", async () => {
		const mockServer = Bun.serve({
			port: 8093,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					return Response.json({
						success: true,
						stdout: "Excel and video generated successfully",
						stderr: "",
						exitCode: 0,
						executionTimeMs: 340,
						artifacts: [
							{
								filename: "crypto_report.xlsx",
								mimeType:
									"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
								type: "document",
								data: "UEsDBBQAAAAIA...",
								sizeBytes: 4096,
							},
							{
								filename: "animation.mp4",
								mimeType: "video/mp4",
								type: "video",
								data: "AAAAHGZ0eXBtcDQy...",
								sizeBytes: 1048576,
							},
						],
						truncated: false,
					});
				}
				return Response.json({ error: "Not found" }, { status: 404 });
			},
		});

		const originalUrl = CONFIG.SANDBOX_URL;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${mockServer.port}`;

		try {
			const result = await codeExecutionTool.execute({
				language: "python",
				code: "import pandas as pd\ndf.to_excel('crypto_report.xlsx')",
			});

			expect(result.success).toBeTrue();
			expect(result.artifacts).toBeDefined();
			expect(result.artifacts?.length).toBe(2);
			expect(result.artifacts?.[0].filename).toBe("crypto_report.xlsx");
			expect(result.artifacts?.[0].type).toBe("document");
			expect(result.artifacts?.[1].filename).toBe("animation.mp4");
			expect(result.artifacts?.[1].type).toBe("video");
			expect(result.system_note).toContain("crypto_report.xlsx (document)");
			expect(result.system_note).toContain("animation.mp4 (video)");
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			mockServer.stop(true);
		}
	});

	test("should handle Cloudflare 403 and Playwright Timeout error hints", async () => {
		const mockServer = Bun.serve({
			port: 8094,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					return Response.json({
						success: false,
						stdout: "",
						stderr: "requests.exceptions.HTTPError: 403 Forbidden\nCloudflare",
						errorHint:
							"Hint: Target website blocked the request (403/429/Cloudflare Bot Protection). Try using 'curl_cffi' (with impersonate='chrome') or 'playwright' with stealth mode and realistic browser headers instead of standard requests.",
						exitCode: 1,
						executionTimeMs: 120,
						truncated: false,
					});
				}
				return Response.json({ error: "Not found" }, { status: 404 });
			},
		});

		const originalUrl = CONFIG.SANDBOX_URL;
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${mockServer.port}`;

		try {
			const result = await codeExecutionTool.execute({
				language: "python",
				code: "import requests\nrequests.get('https://example.com')",
			});

			expect(result.success).toBeFalse();
			expect(result.error_hint).toContain("curl_cffi");
			expect(result.system_note).toContain("Cloudflare Bot Protection");
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			mockServer.stop(true);
		}
	});
});
