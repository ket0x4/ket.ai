import { CONFIG } from "../../src/config/index";

export async function startSandboxServer(port: number): Promise<{
	process: ReturnType<typeof Bun.spawn>;
	originalUrl: string;
}> {
	const originalUrl = CONFIG.SANDBOX_URL;
	CONFIG.SANDBOX_URL = `http://127.0.0.1:${port}`;

	const sandboxProcess = Bun.spawn(["bun", "run", "sandbox/server.ts"], {
		env: {
			...process.env,
			SANDBOX_PORT: port.toString(),
		},
		stdout: "pipe",
		stderr: "pipe",
	});

	for (let i = 0; i < 25; i++) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/health`);
			if (response.ok) return { process: sandboxProcess, originalUrl };
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	sandboxProcess.kill(9);
	CONFIG.SANDBOX_URL = originalUrl;
	throw new Error(`Sandbox server did not become ready on port ${port}`);
}

export function stopSandboxServer(
	sandboxProcess: ReturnType<typeof Bun.spawn> | undefined,
	originalUrl: string,
): void {
	CONFIG.SANDBOX_URL = originalUrl;
	if (sandboxProcess) sandboxProcess.kill(9);
}
