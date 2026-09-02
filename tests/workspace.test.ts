import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { toolRegistry } from "../src/agent/index";
import { executeInSandbox } from "../src/agent/tools/codeExecution";
import {
	listWorkspaceFiles,
	readWorkspaceFile,
	resetWorkspace,
	writeWorkspaceFile,
} from "../src/agent/tools/workspaceTools";
import { CONFIG } from "../src/config/index";

describe("Stateful Session Workspace & Iterative Debugging", () => {
	const testPort = 8199;
	let sandboxProcess: ReturnType<typeof Bun.spawn>;
	const originalSandboxUrl = CONFIG.SANDBOX_URL;
	const sessionId = "test_stateful_session_42";

	beforeAll(async () => {
		CONFIG.SANDBOX_URL = `http://127.0.0.1:${testPort}`;
		sandboxProcess = Bun.spawn(["bun", "run", "sandbox/server.ts"], {
			env: {
				...process.env,
				SANDBOX_PORT: testPort.toString(),
			},
			stdout: "pipe",
			stderr: "pipe",
		});

		// Wait for sandbox server readiness
		for (let i = 0; i < 25; i++) {
			try {
				const res = await fetch(`http://127.0.0.1:${testPort}/health`);
				if (res.ok) break;
			} catch {}
			await new Promise((r) => setTimeout(r, 100));
		}
	});

	afterAll(() => {
		CONFIG.SANDBOX_URL = originalSandboxUrl;
		if (sandboxProcess) {
			try {
				sandboxProcess.kill(9);
			} catch {}
		}
	});

	test("should register all workspace tools in toolRegistry", () => {
		expect(toolRegistry.hasTool("read_workspace_file")).toBeTrue();
		expect(toolRegistry.hasTool("write_workspace_file")).toBeTrue();
		expect(toolRegistry.hasTool("list_workspace_files")).toBeTrue();
		expect(toolRegistry.hasTool("reset_workspace")).toBeTrue();
	});

	test("should write and read files in persistent session workspace", async () => {
		const writeRes = await writeWorkspaceFile({
			filename: "dataset.csv",
			content: "name,age\nAlice,30\nBob,25",
			sessionId,
		});
		expect(writeRes.success).toBeTrue();
		expect(writeRes.filename).toBe("dataset.csv");

		const readRes = await readWorkspaceFile({
			filename: "dataset.csv",
			sessionId,
		});
		expect(readRes.success).toBeTrue();
		expect(readRes.content).toBe("name,age\nAlice,30\nBob,25");
	});

	test("should list files existing in the session workspace", async () => {
		const listRes = await listWorkspaceFiles({ sessionId });
		expect(listRes.success).toBeTrue();
		expect(listRes.totalFiles).toBeGreaterThanOrEqual(1);
		const fileNames = listRes.files.map((f) => f.filename);
		expect(fileNames).toContain("dataset.csv");
	});

	test("should execute code reading previously written workspace files", async () => {
		const execRes = await executeInSandbox({
			language: "python",
			code: `
with open("dataset.csv", "r") as f:
    lines = f.readlines()
print("ROWS_COUNT:", len(lines))
with open("summary.txt", "w") as out:
    out.write("PROCESSED_ROWS: " + str(len(lines)))
`,
			sessionId,
		});

		expect(execRes.success).toBeTrue();
		expect(execRes.stdout).toContain("ROWS_COUNT: 3");

		const summaryRead = await readWorkspaceFile({
			filename: "summary.txt",
			sessionId,
		});
		expect(summaryRead.success).toBeTrue();
		expect(summaryRead.content).toContain("PROCESSED_ROWS: 3");
	});

	test("should support iterative multi-turn debugging flow", async () => {
		const debugSession = "test_debug_flow_99";

		// Step 1: User runs buggy code
		const step1 = await executeInSandbox({
			language: "python",
			filename: "buggy_calc.py",
			code: `
items = [10, 20, 30]
# Bug: index 10 out of bounds
print("VAL:", items[10])
`,
			sessionId: debugSession,
		});

		expect(step1.success).toBeFalse();
		expect(step1.stderr).toContain("IndexError");

		// Step 2: Agent inspects code from workspace
		const readCode = await readWorkspaceFile({
			filename: "buggy_calc.py",
			sessionId: debugSession,
		});
		expect(readCode.success).toBeTrue();
		expect(readCode.content).toContain("items = [10, 20, 30]");

		// Step 3: Agent fixes code and re-runs in the same session
		const step3 = await executeInSandbox({
			language: "python",
			filename: "buggy_calc.py",
			code: `
items = [10, 20, 30]
idx = min(10, len(items) - 1)
print("FIXED_VAL:", items[idx])
`,
			sessionId: debugSession,
		});

		expect(step3.success).toBeTrue();
		expect(step3.stdout).toContain("FIXED_VAL: 30");
	});

	test("should block path traversal attacks", async () => {
		const traversalRead = await readWorkspaceFile({
			filename: "../../../etc/passwd",
			sessionId,
		});
		// Should either fail or be sanitized
		expect(traversalRead.success).toBeFalse();
	});

	test("should block sibling directory prefix traversal attacks", async () => {
		const traversalRead = await readWorkspaceFile({
			filename: `../${sessionId}_evil/secret.txt`,
			sessionId,
		});
		expect(traversalRead.success).toBeFalse();
	});

	test("should prioritize authenticated context.sessionId over untrusted tool args.sessionId", async () => {
		const legitimateSession = "auth_session_legit_100";
		const victimSession = "auth_session_victim_200";

		// Write secret file to victim session
		await writeWorkspaceFile(
			{ filename: "victim_secrets.txt", content: "SECRET_PASSWORD_123" },
			{ sessionId: victimSession },
		);

		// An attacker in legitimateSession attempts to spoof victimSession via args.sessionId
		// while context.sessionId is set to legitimateSession
		const spoofAttempt = await readWorkspaceFile(
			{ filename: "victim_secrets.txt", sessionId: victimSession },
			{ sessionId: legitimateSession }, // Authoritative context from bot
		);

		// Must NOT read victim's file!
		expect(spoofAttempt.success).toBeFalse();
		expect(spoofAttempt.content).toBeUndefined();
	});

	test("should reset workspace cleanly", async () => {
		const resetRes = await resetWorkspace({ sessionId });
		expect(resetRes.success).toBeTrue();

		const listAfterReset = await listWorkspaceFiles({ sessionId });
		expect(listAfterReset.success).toBeTrue();
		expect(listAfterReset.totalFiles).toBe(0);
	});
});
