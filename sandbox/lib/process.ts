import { existsSync } from "node:fs";
import { getSafeEnv } from "./workspace";

async function streamReader(
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
	// Buffer output as it streams so a timeout or cancel can still return the
	// partial stdout/stderr produced before the process was killed.
	let stdoutBuffer = "";
	let stderrBuffer = "";
	const emitStdout = (chunk: string) => {
		stdoutBuffer += chunk;
		try {
			onStdoutChunk?.(chunk);
		} catch {}
	};
	const emitStderr = (chunk: string) => {
		stderrBuffer += chunk;
		try {
			onStderrChunk?.(chunk);
		} catch {}
	};
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
			const note = `Execution timed out after ${timeoutMs}ms.`;
			resolve({
				stdout: stdoutBuffer,
				stderr: stderrBuffer ? `${stderrBuffer}\n${note}` : note,
				exitCode: 124,
			});
		}, timeoutMs);
	});

	const executionPromise = (async () => {
		try {
			await Promise.all([
				streamReader(proc.stdout, emitStdout),
				streamReader(proc.stderr, emitStderr),
			]);
			const exitCode = await proc.exited;
			settled = true;
			if (timer) clearTimeout(timer);

			return {
				stdout: stdoutBuffer,
				stderr: stderrBuffer,
				exitCode: cancelled ? 130 : exitCode,
			};
		} catch (err) {
			if (timer) clearTimeout(timer);
			const message = `Process error: ${err instanceof Error ? err.message : String(err)}`;
			return {
				stdout: stdoutBuffer,
				stderr: stderrBuffer ? `${stderrBuffer}\n${message}` : message,
				exitCode: 1,
			};
		}
	})();

	return Promise.race([executionPromise, timeoutPromise]);
}
