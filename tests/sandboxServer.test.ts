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

	test("should clean up and terminate sandbox daemon", () => {
		if (sandboxProcess) {
			try {
				sandboxProcess.kill(9);
			} catch {}
		}
	});
});
