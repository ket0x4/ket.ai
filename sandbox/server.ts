import { handleCancel } from "./handlers/cancel";
import { handleExecute } from "./handlers/execute";
import {
	handleWorkspaceList,
	handleWorkspaceRead,
	handleWorkspaceReset,
	handleWorkspaceSearch,
	handleWorkspaceWrite,
} from "./handlers/workspace";
import { PORT } from "./lib/config";

export type { ArtifactType, GeneratedArtifact } from "./lib/types";

console.log(`[Ket Sandbox] Starting code execution daemon on port ${PORT}...`);

Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);

		if (req.method === "GET" && url.pathname === "/health") {
			return Response.json({
				status: "ok",
				uptime: process.uptime(),
				runtime: "bun",
				timestamp: new Date().toISOString(),
			});
		}

		if (req.method === "POST" && url.pathname === "/execute") {
			return handleExecute(req);
		}

		if (req.method === "POST" && url.pathname === "/execute/cancel") {
			return handleCancel(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/read") {
			return handleWorkspaceRead(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/write") {
			return handleWorkspaceWrite(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/list") {
			return handleWorkspaceList(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/search") {
			return handleWorkspaceSearch(req);
		}

		if (req.method === "POST" && url.pathname === "/workspace/reset") {
			return handleWorkspaceReset(req);
		}

		return Response.json({ error: "Not found" }, { status: 404 });
	},
});

console.log(`[Ket Sandbox] Daemon listening on http://0.0.0.0:${PORT}`);
