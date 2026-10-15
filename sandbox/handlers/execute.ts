import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detectGeneratedArtifacts } from "../lib/artifacts";
import {
	resolvePythonInstallCommand,
	resolveScriptCommand,
	sanitizePackages,
} from "../lib/commands";
import {
	DEFAULT_TIMEOUT_MS,
	MAX_SESSION_DIR_BYTES,
	MAX_TIMEOUT_MS,
} from "../lib/config";
import { generateErrorHint } from "../lib/errorHints";
import {
	acquireSessionLock,
	createExecution,
	executions,
} from "../lib/execution";
import { runCommand } from "../lib/process";
import type { ExecuteRequest, ExecuteResponse } from "../lib/types";
import {
	getDirectorySizeBytes,
	getWorkspaceSnapshot,
	resolveSafePath,
	resolveWorkspace,
	truncateOutput,
} from "../lib/workspace";

export async function handleExecute(req: Request): Promise<Response> {
	let body: ExecuteRequest;
	try {
		body = (await req.json()) as ExecuteRequest;
	} catch {
		return Response.json(
			{ success: false, error: "Invalid JSON request body" },
			{ status: 400 },
		);
	}

	const { language, code, sessionId, filename, targetFiles } = body;
	if (!code || typeof code !== "string") {
		return Response.json(
			{ success: false, error: "Missing or invalid 'code' string parameter" },
			{ status: 400 },
		);
	}

	const normalizedLang = (language || "python").toLowerCase();
	if (
		!["python", "javascript", "typescript", "bash", "sh"].includes(
			normalizedLang,
		)
	) {
		return Response.json(
			{
				success: false,
				error: `Unsupported language '${language}'. Supported: python, javascript, typescript, bash`,
			},
			{ status: 400 },
		);
	}

	const timeout = Math.min(
		Math.max(Number(body.timeoutMs) || DEFAULT_TIMEOUT_MS, 1000),
		MAX_TIMEOUT_MS,
	);
	const packages = sanitizePackages(body.packages);
	const { workspaceDir, isPersistent } = resolveWorkspace(sessionId);
	const execution = createExecution(sessionId, body.executionId);
	const releaseSession = await acquireSessionLock(sessionId);

	// Quota check
	if (getDirectorySizeBytes(workspaceDir) > MAX_SESSION_DIR_BYTES) {
		releaseSession();
		executions.delete(execution.executionId);
		return Response.json(
			{
				success: false,
				error:
					"Session workspace disk quota exceeded (50MB). Please reset the workspace.",
			},
			{ status: 413 },
		);
	}
	if (execution.cancelRequested) {
		releaseSession();
		executions.delete(execution.executionId);
		return Response.json({
			executionId: execution.executionId,
			status: "cancelled",
			success: false,
			stdout: "",
			stderr: "Execution cancelled before it started.",
			exitCode: 130,
			executionTimeMs: 0,
		});
	}

	const isStreaming =
		Boolean(body.stream) ||
		req.headers.get("accept")?.includes("text/event-stream") === true;

	const startTime = Date.now();
	let packageInstallStderr = "";
	const installedPackages: string[] = [];

	if (isStreaming) {
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				const sendEvent = (event: string, data: unknown) => {
					try {
						const payload =
							typeof data === "string" ? data : JSON.stringify(data);
						controller.enqueue(
							encoder.encode(`event: ${event}\ndata: ${payload}\n\n`),
						);
					} catch {}
				};

				try {
					sendEvent("status", {
						stage: "queued",
						executionId: execution.executionId,
						message: "Execution queued.",
					});
					if (execution.cancelRequested) {
						sendEvent("result", {
							executionId: execution.executionId,
							status: "cancelled",
							success: false,
							stdout: "",
							stderr: "Execution cancelled before it started.",
							exitCode: 130,
							executionTimeMs: 0,
						});
						return;
					}
					execution.status = "running";
					// Step 1: Install packages if requested
					if (packages.length > 0) {
						execution.status = "installing";
						sendEvent("status", {
							stage: "installing",
							message: `Installing packages: ${packages.join(", ")}...`,
						});
						let installCmd: string[] = [];

						if (normalizedLang === "python") {
							installCmd = resolvePythonInstallCommand(packages);
						} else if (
							normalizedLang === "javascript" ||
							normalizedLang === "typescript"
						) {
							installCmd = ["bun", "add", ...packages];
						}

						if (installCmd.length > 0) {
							const pkgResult = await runCommand(
								installCmd,
								workspaceDir,
								60_000,
								(chunk) => sendEvent("stdout", chunk),
								(chunk) => sendEvent("stderr", chunk),
								(cancel) => {
									execution.cancel = cancel;
								},
							);
							if (pkgResult.exitCode !== 0) {
								console.warn(
									`[Sandbox:${workspaceDir}] Package install warning / error:`,
									pkgResult.stderr,
								);
								packageInstallStderr = `Package installation warning:\n${pkgResult.stderr}\n`;
								sendEvent("status", {
									stage: "install_warning",
									message: `Package install warning: ${pkgResult.stderr.slice(0, 200)}`,
								});
							} else {
								installedPackages.push(...packages);
								sendEvent("status", {
									stage: "install_success",
									message: `Packages installed successfully: ${packages.join(", ")}`,
								});
							}
						}
						if (execution.cancelRequested) {
							throw new Error("Execution cancelled.");
						}
					}

					// Step 2: Take snapshot of existing files in workspace before execution
					const beforeSnapshot = getWorkspaceSnapshot(workspaceDir);

					// Step 3: Write script file
					const { scriptFileName, execCommand } = resolveScriptCommand(
						normalizedLang,
						filename,
					);
					const scriptPath = resolveSafePath(workspaceDir, scriptFileName);
					writeFileSync(scriptPath, code, "utf-8");

					// Step 4: Execute script with live stream
					sendEvent("status", {
						stage: "executing",
						message: `Executing ${normalizedLang} script (${scriptFileName})...`,
					});

					const result = await runCommand(
						execCommand,
						workspaceDir,
						timeout,
						(chunk) => sendEvent("stdout", chunk),
						(chunk) => sendEvent("stderr", chunk),
						(cancel) => {
							execution.cancel = cancel;
						},
					);
					const durationMs = Date.now() - startTime;
					execution.status = result.exitCode === 130 ? "cancelled" : "collecting";

					const totalStderr = packageInstallStderr
						? `${packageInstallStderr}\n${result.stderr}`
						: result.stderr;

					sendEvent("status", {
						stage: "detecting_artifacts",
						message: "Scanning workspace for generated files, charts, and media...",
					});

					// Detect any artifacts generated specifically by this script execution
					const notes: string[] = [];
					const generatedArtifacts = detectGeneratedArtifacts(
						workspaceDir,
						[scriptFileName, "package.json", "bun.lock", ".session_meta.json"],
						beforeSnapshot,
						targetFiles,
						notes,
					);
					const generatedImages = generatedArtifacts.filter(
						(a) => a.type === "image",
					);

					const stdoutTruncated = truncateOutput(result.stdout);
					const stderrTruncated = truncateOutput(totalStderr);
					const errorHint = generateErrorHint(totalStderr, result.exitCode);

					// Save session metadata for continuity
					if (isPersistent) {
						try {
							const metaPath = join(workspaceDir, ".session_meta.json");
							writeFileSync(
								metaPath,
								JSON.stringify(
									{
										lastLanguage: normalizedLang,
										lastScriptFile: scriptFileName,
										lastExitCode: result.exitCode,
										lastExecutionTimeMs: durationMs,
										lastStderrSnippet: totalStderr.slice(0, 500),
										lastStdoutSnippet: result.stdout.slice(0, 500),
										lastExecutedAt: new Date().toISOString(),
										errorHint,
									},
									null,
									2,
								),
								"utf-8",
							);
						} catch {}
					}

					const responsePayload: ExecuteResponse = {
						executionId: execution.executionId,
						status:
							result.exitCode === 130
								? "cancelled"
								: result.exitCode === 0
									? "completed"
									: "failed",
						success: result.exitCode === 0,
						stdout: stdoutTruncated.text,
						stderr: stderrTruncated.text,
						exitCode: result.exitCode,
						executionTimeMs: durationMs,
						installedPackages,
						artifacts:
							generatedArtifacts.length > 0 ? generatedArtifacts : undefined,
						images:
							generatedImages.length > 0 ? generatedImages : undefined,
						errorHint,
						truncated: stdoutTruncated.truncated || stderrTruncated.truncated,
						notes: notes.length > 0 ? notes : undefined,
					};

					sendEvent("result", responsePayload);
					execution.status = responsePayload.status;
				} catch (error) {
					const durationMs = Date.now() - startTime;
					const errMessage =
						error instanceof Error ? error.message : String(error);
					console.error(`[Sandbox:${workspaceDir}] Streaming execution exception:`, error);
					const wasCancelled = execution.cancelRequested;
					execution.status = wasCancelled ? "cancelled" : "failed";
					sendEvent("result", {
						executionId: execution.executionId,
						status: wasCancelled ? "cancelled" : "failed",
						success: false,
						stdout: "",
						stderr: errMessage,
						exitCode: wasCancelled ? 130 : 1,
						executionTimeMs: durationMs,
						error: errMessage,
					});
				} finally {
					// Clean up isolated temporary workspace
					if (!isPersistent) {
						try {
							rmSync(workspaceDir, { recursive: true, force: true });
						} catch (cleanupErr) {
							console.warn(
								`[Sandbox:${workspaceDir}] Failed to clean up workspace:`,
								cleanupErr,
							);
						}
					}
					releaseSession();
					executions.delete(execution.executionId);
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}

	try {
		execution.status = "running";
		// Step 1: Install packages if requested
		if (packages.length > 0) {
			console.log(
				`[Sandbox:${workspaceDir}] Installing packages: ${packages.join(", ")}`,
			);
			let installCmd: string[] = [];

			if (normalizedLang === "python") {
				installCmd = resolvePythonInstallCommand(packages);
			} else if (
				normalizedLang === "javascript" ||
				normalizedLang === "typescript"
			) {
				installCmd = ["bun", "add", ...packages];
			}

			if (installCmd.length > 0) {
				execution.status = "installing";
				const pkgResult = await runCommand(
					installCmd,
					workspaceDir,
					60_000,
					undefined,
					undefined,
					(cancel) => {
						execution.cancel = cancel;
					},
				);
				if (pkgResult.exitCode !== 0) {
					console.warn(
						`[Sandbox:${workspaceDir}] Package install warning / error:`,
						pkgResult.stderr,
					);
					packageInstallStderr = `Package installation warning:\n${pkgResult.stderr}\n`;
				} else {
					installedPackages.push(...packages);
				}
			}
		}
		if (execution.cancelRequested) {
			return Response.json({
				executionId: execution.executionId,
				status: "cancelled",
				success: false,
				stdout: "",
				stderr: "Execution cancelled.",
				exitCode: 130,
				executionTimeMs: Date.now() - startTime,
			});
		}

		// Step 2: Take snapshot of existing files in workspace before execution
		const beforeSnapshot = getWorkspaceSnapshot(workspaceDir);

		// Step 3: Write script file
		const { scriptFileName, execCommand } = resolveScriptCommand(
			normalizedLang,
			filename,
		);
		const scriptPath = resolveSafePath(workspaceDir, scriptFileName);
		writeFileSync(scriptPath, code, "utf-8");

		// Step 4: Execute script
		console.log(
			`[Sandbox:${workspaceDir}] Executing ${normalizedLang} script (${scriptFileName}, timeout: ${timeout}ms)...`,
		);
		const result = await runCommand(
			execCommand,
			workspaceDir,
			timeout,
			undefined,
			undefined,
			(cancel) => {
				execution.cancel = cancel;
			},
		);
		const durationMs = Date.now() - startTime;
		execution.status = result.exitCode === 130 ? "cancelled" : "collecting";

		const totalStderr = packageInstallStderr
			? `${packageInstallStderr}\n${result.stderr}`
			: result.stderr;

		// Detect any artifacts generated specifically by this script execution
		const notes: string[] = [];
		const generatedArtifacts = detectGeneratedArtifacts(
			workspaceDir,
			[scriptFileName, "package.json", "bun.lock", ".session_meta.json"],
			beforeSnapshot,
			targetFiles,
			notes,
		);
		const generatedImages = generatedArtifacts.filter((a) => a.type === "image");

		const stdoutTruncated = truncateOutput(result.stdout);
		const stderrTruncated = truncateOutput(totalStderr);
		const errorHint = generateErrorHint(totalStderr, result.exitCode);

		// Save session metadata for continuity
		if (isPersistent) {
			try {
				const metaPath = join(workspaceDir, ".session_meta.json");
				writeFileSync(
					metaPath,
					JSON.stringify(
						{
							lastLanguage: normalizedLang,
							lastScriptFile: scriptFileName,
							lastExitCode: result.exitCode,
							lastExecutionTimeMs: durationMs,
							lastStderrSnippet: totalStderr.slice(0, 500),
							lastStdoutSnippet: result.stdout.slice(0, 500),
							lastExecutedAt: new Date().toISOString(),
							errorHint,
						},
						null,
						2,
					),
					"utf-8",
				);
			} catch {}
		}

		const responsePayload: ExecuteResponse = {
			executionId: execution.executionId,
			status:
				result.exitCode === 130
					? "cancelled"
					: result.exitCode === 0
						? "completed"
						: "failed",
			success: result.exitCode === 0,
			stdout: stdoutTruncated.text,
			stderr: stderrTruncated.text,
			exitCode: result.exitCode,
			executionTimeMs: durationMs,
			installedPackages,
			artifacts: generatedArtifacts.length > 0 ? generatedArtifacts : undefined,
			images: generatedImages.length > 0 ? generatedImages : undefined,
			errorHint,
			truncated: stdoutTruncated.truncated || stderrTruncated.truncated,
			notes: notes.length > 0 ? notes : undefined,
		};

		return Response.json(responsePayload);
	} catch (error) {
		const durationMs = Date.now() - startTime;
		const errMessage = error instanceof Error ? error.message : String(error);
		console.error(`[Sandbox:${workspaceDir}] Execution exception:`, error);
		return Response.json(
			{
				success: false,
				stdout: "",
				stderr: errMessage,
				exitCode: 1,
				executionTimeMs: durationMs,
				error: errMessage,
			},
			{ status: 500 },
		);
	} finally {
		releaseSession();
		executions.delete(execution.executionId);
		// Clean up isolated temporary workspace (keep persistent session directories)
		if (!isPersistent) {
			try {
				rmSync(workspaceDir, { recursive: true, force: true });
			} catch (cleanupErr) {
				console.warn(
					`[Sandbox:${workspaceDir}] Failed to clean up workspace:`,
					cleanupErr,
				);
			}
		}
	}
}
