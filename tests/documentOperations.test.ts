import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { toolRegistry } from "../src/agent/index";
import { executeInSandbox } from "../src/agent/tools/codeExecution";
import {
	readWorkspaceFile,
	sendWorkspaceFile,
	writeWorkspaceFile,
} from "../src/agent/tools/workspaceTools";
import type {
	GeneratedMediaArtifact,
	ToolExecutionContext,
} from "../src/agent/types";
import { CONFIG } from "../src/config/index";
import { Repository } from "../src/db/repository";
import {
	classifyDocument,
	prepareDocumentContext,
	sanitizeDocumentFilename,
	stageDocumentInWorkspace,
} from "../src/services/gemini/documentPerception";

describe("Document Handling, Staging & Operations", () => {
	const testPort = 8198;
	let sandboxProcess: ReturnType<typeof Bun.spawn>;
	const originalSandboxUrl = CONFIG.SANDBOX_URL;
	const sessionId = "doc_test_session_101";

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

	test("sanitizeDocumentFilename prevents path traversal and special characters", () => {
		expect(sanitizeDocumentFilename("../../../evil.py")).toBe("evil.py");
		expect(sanitizeDocumentFilename("/etc/passwd")).toBe("passwd");
		expect(sanitizeDocumentFilename("my file (1).txt")).toBe("my_file__1_.txt");
		expect(sanitizeDocumentFilename(undefined)).toBe("document.bin");
	});

	test("classifyDocument categorizes code, data, pdf, and images properly", () => {
		const pyBuf = Buffer.from("print('hello')");
		const pyClass = classifyDocument("script.py", "text/x-python", pyBuf);
		expect(pyClass.isText).toBeTrue();
		expect(pyClass.isPdf).toBeFalse();

		const pdfBuf = Buffer.from("%PDF-1.4 header");
		const pdfClass = classifyDocument("report.pdf", "application/pdf", pdfBuf);
		expect(pdfClass.isPdf).toBeTrue();
		expect(pdfClass.isText).toBeFalse();

		const csvBuf = Buffer.from("id,val\n1,10");
		const csvClass = classifyDocument("data.csv", "text/csv", csvBuf);
		expect(csvClass.isText).toBeTrue();

		const xlsxBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK zip header
		const xlsxClass = classifyDocument(
			"table.xlsx",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			xlsxBuf,
		);
		expect(xlsxClass.isSpreadsheet).toBeTrue();
	});

	test("prepareDocumentContext prepares rich context and summary hints", () => {
		const code = "def add(a, b):\n    return a + b\n";
		const buf = Buffer.from(code, "utf-8");
		const ctx = prepareDocumentContext(buf, "math_lib.py", "text/x-python");

		expect(ctx.fileName).toBe("math_lib.py");
		expect(ctx.isText).toBeTrue();
		expect(ctx.textContent).toBe(code);
		expect(ctx.summaryHint).toContain("Text/Code file");
	});

	test("stageDocumentInWorkspace stages text and binary files in session workspace", async () => {
		const pyCode = "print('Stage Test Success')";
		const stageRes = await stageDocumentInWorkspace(
			sessionId,
			"stage_test.py",
			Buffer.from(pyCode, "utf-8"),
			true,
		);
		expect(stageRes.success).toBeTrue();

		// Verify file is readable from workspace
		const readRes = await readWorkspaceFile({
			filename: "stage_test.py",
			sessionId,
		});
		expect(readRes.success).toBeTrue();
		expect(readRes.content).toBe(pyCode);
	});

	test("executes uploaded code file in sandbox and captures output", async () => {
		// User uploaded fib.py to workspace
		const fibCode = `
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print("FIB_10:", fib(10))
`;
		await stageDocumentInWorkspace(
			sessionId,
			"fib.py",
			Buffer.from(fibCode, "utf-8"),
			true,
		);

		// Execute via executeInSandbox
		const runRes = await executeInSandbox({
			language: "bash",
			code: "python3 fib.py",
			sessionId,
		});

		expect(runRes.success).toBeTrue();
		expect(runRes.stdout).toContain("FIB_10: 55");
	});

	test("supports editing uploaded file and delivering updated file to user via send_workspace_file", async () => {
		// Step 1: Upload original buggy code
		const buggyCode = `
def greet(name):
    # Bug: undefined var
    return "Hello " + username
`;
		await stageDocumentInWorkspace(
			sessionId,
			"greeting.py",
			Buffer.from(buggyCode, "utf-8"),
			true,
		);

		// Step 2: Edit and fix code using writeWorkspaceFile
		const fixedCode = `
def greet(name):
    return "Hello " + name

print(greet("World"))
`;
		const emittedArtifacts: GeneratedMediaArtifact[] = [];
		const mockContext: ToolExecutionContext = {
			sessionId,
			emitArtifact: (art) => emittedArtifacts.push(art),
		};

		const writeRes = await writeWorkspaceFile(
			{
				filename: "greeting.py",
				content: fixedCode,
				sendToUser: true, // Should emit artifact!
			},
			mockContext,
		);

		expect(writeRes.success).toBeTrue();
		expect(emittedArtifacts.length).toBe(1);
		expect(emittedArtifacts[0].filename).toBe("greeting.py");
		expect(emittedArtifacts[0].buffer.toString("utf-8")).toBe(fixedCode);

		// Step 3: Explicit sendWorkspaceFile tool also works
		const sendRes = await sendWorkspaceFile(
			{ filename: "greeting.py" },
			mockContext,
		);
		expect(sendRes.success).toBeTrue();
		expect(emittedArtifacts.length).toBe(2);
		expect(emittedArtifacts[1].filename).toBe("greeting.py");

		// Step 4: Run the fixed code to verify it works
		const runFixed = await executeInSandbox({
			language: "bash",
			code: "python3 greeting.py",
			sessionId,
		});
		expect(runFixed.success).toBeTrue();
		expect(runFixed.stdout).toContain("Hello World");
	});

	test("toolRegistry includes send_workspace_file and all workspace tools", () => {
		expect(toolRegistry.hasTool("send_workspace_file")).toBeTrue();
		expect(toolRegistry.hasTool("write_workspace_file")).toBeTrue();
		expect(toolRegistry.hasTool("read_workspace_file")).toBeTrue();
		expect(toolRegistry.hasTool("list_workspace_files")).toBeTrue();
	});

	test("SQLite repository stores and retrieves document metadata correctly", () => {
		const testChatId = "chat_doc_metadata_test";
		const testMsgId = 998877;
		const now = Math.floor(Date.now() / 1000);

		Repository.createChat(testChatId, "Test Chat", true);

		Repository.saveMessage({
			chatId: testChatId,
			messageId: testMsgId,
			userId: 12345,
			username: "coder",
			firstName: "Dev",
			text: "[Document: analysis.py]",
			documentFileId: "tg_file_id_abc123",
			documentFileName: "analysis.py",
			documentMimeType: "text/x-python",
			isBotReply: false,
			sentAt: now,
		});

		const retrieved = Repository.getMessage(testChatId, testMsgId);
		expect(retrieved).toBeDefined();
		expect(retrieved?.document_file_id).toBe("tg_file_id_abc123");
		expect(retrieved?.document_file_name).toBe("analysis.py");
		expect(retrieved?.document_mime_type).toBe("text/x-python");
		expect(retrieved?.text).toBe("[Document: analysis.py]");
	});
});
