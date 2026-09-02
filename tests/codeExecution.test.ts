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

	test("should handle sandbox execution errors (non-zero exit code)", async () => {
		const mockServer = Bun.serve({
			port: 8091,
			fetch(req) {
				const url = new URL(req.url);
				if (url.pathname === "/execute" && req.method === "POST") {
					return Response.json({
						success: false,
						stdout: "",
						stderr: "ModuleNotFoundError: No module named 'nonexistent_lib'",
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
			expect(result.system_note).toContain("finished with errors");
		} finally {
			CONFIG.SANDBOX_URL = originalUrl;
			mockServer.stop(true);
		}
	});
});
