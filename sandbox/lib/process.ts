import { existsSync } from "node:fs";
import { getSafeEnv } from "./workspace";

export async function streamReader(
	stream: ReadableStream<Uint8Array>,
	onChunk?: (chunk: string) => void,
): Promise<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let accumulated = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				const text = decoder.decode(value, { stream: true });
				accumulated += text;
				if (onChunk) {
					try {
						onChunk(text);
					} catch {}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
	return accumulated;
}

export async function runCommand(
	cmd: string[],
	cwd: string,
	timeoutMs: number,
	onStdoutChunk?: (chunk: string) => void,
	onStderrChunk?: (chunk: string) => void,
	onProcess?: (cancel: () => void) => void,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	// Start a new process group where `setsid` is available so cancellation
	// also terminates descendants such as shell pipelines and browser processes.
	const canCreateProcessGroup =
		existsSync("/usr/bin/setsid") || existsSync("/bin/setsid");
	const proc = Bun.spawn(canCreateProcessGroup ? ["setsid", ...cmd] : cmd, {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: getSafeEnv(),
	});
	let settled = false;
	let cancelled = false;
	const cancel = () => {
		if (settled) return;
		cancelled = true;
		if (canCreateProcessGroup) {
			try {
				process.kill(-proc.pid, 9);
			} catch {}
		}
		try {
			proc.kill(9);
		} catch {}
	};
	onProcess?.(cancel);

	let timer: Timer | undefined;

	const timeoutPromise = new Promise<{
		stdout: string;
		stderr: string;
		exitCode: number;
	}>((resolve) => {
		timer = setTimeout(() => {
			cancel();
			settled = true;
			resolve({
				stdout: "",
				stderr: `Execution timed out after ${timeoutMs}ms.`,
				exitCode: 124,
			});
		}, timeoutMs);
	});

	const executionPromise = (async () => {
		try {
			const [stdoutText, stderrText] = await Promise.all([
				streamReader(proc.stdout, onStdoutChunk),
				streamReader(proc.stderr, onStderrChunk),
			]);
			const exitCode = await proc.exited;
			settled = true;
			if (timer) clearTimeout(timer);

			return {
				stdout: stdoutText,
				stderr: stderrText,
				exitCode: cancelled ? 130 : exitCode,
			};
		} catch (err) {
			if (timer) clearTimeout(timer);
			return {
				stdout: "",
				stderr: `Process error: ${err instanceof Error ? err.message : String(err)}`,
				exitCode: 1,
			};
		}
	})();

	return Promise.race([executionPromise, timeoutPromise]);
}
