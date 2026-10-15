import path from "node:path";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

export function serveStaticFile(pathname: string): Response {
	const relPath =
		pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
	const filePath = path.resolve(PUBLIC_DIR, relPath);
	if (!filePath.startsWith(PUBLIC_DIR)) {
		return new Response("Forbidden", { status: 403 });
	}

	const hasExt = Boolean(path.extname(filePath));
	const file = Bun.file(filePath);

	if (hasExt) {
		if (file.size === 0) return new Response("Not Found", { status: 404 });
		return new Response(file, {
			headers: {
				"Cache-Control": relPath.startsWith("assets/")
					? "public, max-age=31536000, immutable"
					: "no-cache, no-store, must-revalidate",
			},
		});
	}

	const indexFile = Bun.file(path.join(PUBLIC_DIR, "index.html"));
	if (indexFile.size === 0) {
		return new Response(
			"Application not built. Please run bun run build:web.",
			{
				status: 404,
			},
		);
	}

	return new Response(indexFile, {
		headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
	});
}
