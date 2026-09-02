import { describe, expect, test } from "bun:test";

describe("Sandbox Server Daemon", () => {
	const testPort = 8188;
	let sandboxProcess: ReturnType<typeof Bun.spawn>;

	test("should start sandbox daemon and respond to /health", async () => {
		sandboxProcess = Bun.spawn(["bun", "run", "sandbox/server.ts"], {
			env: {
				...process.env,
				SANDBOX_PORT: testPort.toString(),
			},
			stdout: "pipe",
			stderr: "pipe",
		});

		// Wait for server to be ready
		let ready = false;
		for (let i = 0; i < 20; i++) {
			try {
				const res = await fetch(`http://127.0.0.1:${testPort}/health`);
				if (res.ok) {
					const data = (await res.json()) as { status: string };
					if (data.status === "ok") {
						ready = true;
						break;
					}
				}
			} catch {}
			await new Promise((r) => setTimeout(r, 100));
		}

		expect(ready).toBeTrue();
	});

	test("should execute bash commands and capture stdout", async () => {
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "bash",
				code: "echo 'KET_SANDBOX_SUCCESS'",
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stdout: string;
			exitCode: number;
		};
		expect(data.success).toBeTrue();
		expect(data.stdout.trim()).toBe("KET_SANDBOX_SUCCESS");
		expect(data.exitCode).toBe(0);
	});

	test("should execute Python scripts and compute calculations", async () => {
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: "import math\nprint('PI:', round(math.pi, 4))",
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stdout: string;
			exitCode: number;
		};
		expect(data.success).toBeTrue();
		expect(data.stdout).toContain("PI: 3.1416");
		expect(data.exitCode).toBe(0);
	});

	test("should execute TypeScript scripts via Bun runtime", async () => {
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "typescript",
				code: `
interface Book { title: string; rank: number; }
const books: Book[] = [{ title: "Atomic Habits", rank: 1 }];
console.log(JSON.stringify(books));
`,
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stdout: string;
			exitCode: number;
		};
		expect(data.success).toBeTrue();
		expect(data.stdout).toContain("Atomic Habits");
		expect(data.exitCode).toBe(0);
	});

	test("should enforce execution timeout and terminate hung scripts", async () => {
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "bash",
				code: "sleep 10",
				timeoutMs: 1000,
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stderr: string;
			exitCode: number;
		};
		expect(data.success).toBeFalse();
		expect(data.stderr).toContain("timed out");
		expect(data.exitCode).toBe(124);
	});

	test("should detect and return generated image artifacts as base64", async () => {
		// Script generates a small PNG file
		const pngBase64 =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: `
import base64
with open("plot.png", "wb") as f:
    f.write(base64.b64decode("${pngBase64}"))
print("Saved plot.png")
`,
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stdout: string;
			images?: Array<{
				filename: string;
				mimeType: string;
				data: string;
				sizeBytes: number;
			}>;
		};

		expect(data.success).toBeTrue();
		expect(data.images).toBeDefined();
		expect(data.images?.length).toBe(1);
		expect(data.images?.[0].filename).toBe("plot.png");
		expect(data.images?.[0].mimeType).toBe("image/png");
		expect(data.images?.[0].data).toBe(pngBase64);
		expect(data.images?.[0].sizeBytes).toBeGreaterThan(0);
	});

	test("should isolate environment variables and hide host secrets from scripts", async () => {
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: `
import os
print("TELEGRAM_BOT_TOKEN:", os.environ.get("TELEGRAM_BOT_TOKEN", "NOT_FOUND"))
print("GEMINI_API_KEY:", os.environ.get("GEMINI_API_KEY", "NOT_FOUND"))
print("MPLBACKEND:", os.environ.get("MPLBACKEND", "NOT_FOUND"))
`,
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stdout: string;
		};

		expect(data.success).toBeTrue();
		expect(data.stdout).toContain("TELEGRAM_BOT_TOKEN: NOT_FOUND");
		expect(data.stdout).toContain("GEMINI_API_KEY: NOT_FOUND");
		expect(data.stdout).toContain("MPLBACKEND: Agg");
	});

	test("should provide intelligent error hints for ModuleNotFoundError and SyntaxError", async () => {
		const resMissing = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: "import non_existent_custom_pkg",
			}),
		});

		expect(resMissing.ok).toBeTrue();
		const dataMissing = (await resMissing.json()) as {
			success: boolean;
			errorHint?: string;
		};
		expect(dataMissing.success).toBeFalse();
		expect(dataMissing.errorHint).toContain("non_existent_custom_pkg");
		expect(dataMissing.errorHint).toContain(
			"packages: ['non_existent_custom_pkg']",
		);

		const resSyntax = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: "def invalid_syntax(:",
			}),
		});

		expect(resSyntax.ok).toBeTrue();
		const dataSyntax = (await resSyntax.json()) as {
			success: boolean;
			errorHint?: string;
		};
		expect(dataSyntax.success).toBeFalse();
		expect(dataSyntax.errorHint).toContain("SyntaxError");
	});

	test("should detect and return generated document artifacts (csv, json) as base64", async () => {
		const res = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: `
with open("data.csv", "w") as f:
    f.write("name,price\\nBitcoin,65000\\nEthereum,3500\\n")
print("Saved data.csv")
`,
			}),
		});

		expect(res.ok).toBeTrue();
		const data = (await res.json()) as {
			success: boolean;
			stdout: string;
			artifacts?: Array<{
				filename: string;
				mimeType: string;
				data: string;
				sizeBytes: number;
				type: string;
			}>;
		};

		expect(data.success).toBeTrue();
		expect(data.artifacts).toBeDefined();
		expect(data.artifacts?.length).toBe(1);
		expect(data.artifacts?.[0].filename).toBe("data.csv");
		expect(data.artifacts?.[0].mimeType).toBe("text/csv");
		expect(data.artifacts?.[0].type).toBe("document");
		expect(data.artifacts?.[0].sizeBytes).toBeGreaterThan(0);
	});

	test("should provide intelligent error hints for KeyError and Cloudflare 403", async () => {
		const resKeyError = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: "data = {}\nval = data['missing_key']",
			}),
		});

		expect(resKeyError.ok).toBeTrue();
		const dataKey = (await resKeyError.json()) as {
			success: boolean;
			errorHint?: string;
		};
		expect(dataKey.success).toBeFalse();
		expect(dataKey.errorHint).toContain("KeyError");

		const resBotBlock = await fetch(`http://127.0.0.1:${testPort}/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				language: "python",
				code: "import sys\nsys.stderr.write('HTTPError: 403 Forbidden Cloudflare\\n')\nsys.exit(1)",
			}),
		});

		expect(resBotBlock.ok).toBeTrue();
		const dataBot = (await resBotBlock.json()) as {
			success: boolean;
			errorHint?: string;
		};
		expect(dataBot.success).toBeFalse();
		expect(dataBot.errorHint).toContain("curl_cffi");
	});

	test("should clean up and terminate sandbox daemon", () => {
		if (sandboxProcess) {
			try {
				sandboxProcess.kill(9);
			} catch {}
		}
	});
});
