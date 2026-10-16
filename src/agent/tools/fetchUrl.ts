import { CONFIG } from "../../config";
import logger from "../../utils/logger";
import type { AgentTool, ToolExecutionContext } from "../types";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_CHARS = 6000;
const MAX_RAW_BYTES = 3 * 1024 * 1024;

interface FetchUrlArgs {
	url: string;
	maxChars?: number;
	timeoutMs?: number;
}

interface FetchUrlResult {
	success: boolean;
	url: string;
	final_url?: string;
	status?: number;
	content_type?: string;
	text?: string;
	truncated?: boolean;
	bytes?: number;
	error?: string;
	system_note?: string;
}

const ENTITY_MAP: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	rsquo: "’",
	lsquo: "‘",
	rdquo: "”",
	ldquo: "“",
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
		if (entity.startsWith("#x") || entity.startsWith("#X")) {
			const code = Number.parseInt(entity.slice(2), 16);
			return Number.isNaN(code) ? match : String.fromCodePoint(code);
		}
		if (entity.startsWith("#")) {
			const code = Number.parseInt(entity.slice(1), 10);
			return Number.isNaN(code) ? match : String.fromCodePoint(code);
		}
		return ENTITY_MAP[entity.toLowerCase()] ?? match;
	});
}

/**
 * Converts an HTML document into readable plain text: drops script/style/nav
 * noise, collapses whitespace, and decodes common entities.
 */
function htmlToText(html: string): string {
	if (!html) return "";
	const withoutNoise = html
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
		.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, " ");
	const decoded = decodeEntities(withoutNoise);
	return decoded
		.replace(/[ \t\f\v\u00a0]+/g, " ")
		.replace(/\n\s*\n\s*\n+/g, "\n\n")
		.replace(/[ \t]+\n/g, "\n")
		.trim();
}

async function readFetchBody(
	response: Response,
	rawUrl: string,
	maxChars: number,
): Promise<FetchUrlResult> {
	const contentType = response.headers.get("content-type") || "";
	const buffer = Buffer.from(await response.arrayBuffer());
	if (buffer.byteLength > MAX_RAW_BYTES) {
		return {
			success: false,
			url: rawUrl,
			final_url: response.url,
			status: response.status,
			content_type: contentType,
			error: `Response too large (${buffer.byteLength} bytes).`,
			system_note:
				"The page is too large to read directly. Use execute_code with a scraping library instead.",
		};
	}

	const raw = buffer.toString("utf-8");
	const isHtml =
		contentType.includes("html") || /^\s*<(!doctype|html)/i.test(raw);
	const text = isHtml ? htmlToText(raw) : raw.trim();
	const truncated = text.length > maxChars;

	return {
		success: response.ok,
		url: rawUrl,
		final_url: response.url !== rawUrl ? response.url : undefined,
		status: response.status,
		content_type: contentType || undefined,
		text: truncated ? text.slice(0, maxChars) : text,
		truncated,
		bytes: buffer.byteLength,
		system_note: response.ok
			? undefined
			: `The server returned HTTP ${response.status}. The content above may be an error page.`,
	};
}

function validateFetchUrl(rawUrl: string): {
	parsed?: URL;
	error?: FetchUrlResult;
} {
	if (!rawUrl) {
		return {
			error: {
				success: false,
				url: "",
				error: "Empty URL.",
				system_note: "Provide a valid http(s) URL.",
			},
		};
	}
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		return {
			error: {
				success: false,
				url: rawUrl,
				error: "Invalid URL.",
				system_note: "The URL could not be parsed. Use a full http(s) URL.",
			},
		};
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return {
			error: {
				success: false,
				url: rawUrl,
				error: `Unsupported protocol '${parsed.protocol}'.`,
				system_note: "Only http and https URLs can be fetched.",
			},
		};
	}
	return { parsed };
}

/**
 * Fetches a URL and returns readable text. Intended for lightweight page
 * reads without paying for a full sandbox round trip. HTML is converted to
 * plain text; JSON/text bodies are returned as-is.
 */
async function fetchUrl(
	args: FetchUrlArgs,
	context?: ToolExecutionContext,
): Promise<FetchUrlResult> {
	const rawUrl = (args.url || "").trim();
	const { parsed, error } = validateFetchUrl(rawUrl);
	if (error || !parsed) return error as FetchUrlResult;

	const timeoutMs =
		Number.isFinite(args.timeoutMs) && (args.timeoutMs as number) > 0
			? Math.min(args.timeoutMs as number, 60000)
			: DEFAULT_TIMEOUT_MS;
	const maxChars =
		Number.isFinite(args.maxChars) && (args.maxChars as number) > 0
			? Math.min(args.maxChars as number, 40000)
			: DEFAULT_MAX_CHARS;

	const signals = [AbortSignal.timeout(timeoutMs)];
	if (context?.signal) signals.push(context.signal);

	try {
		logger.info(`[FetchUrlTool] Fetching ${parsed.toString()}...`);
		const response = await fetch(parsed.toString(), {
			redirect: "follow",
			signal: AbortSignal.any(signals),
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; ket.ai/1.0; +https://t.me/) readability-fetcher",
				Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8",
			},
		});
		return await readFetchBody(response, rawUrl, maxChars);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.warn(`[FetchUrlTool] Failed to fetch ${rawUrl}:`, message);
		const timedOut = err instanceof Error && err.name === "TimeoutError";
		return {
			success: false,
			url: rawUrl,
			error: message,
			system_note: timedOut
				? `The request timed out after ${timeoutMs}ms.`
				: "The page could not be fetched. Try a different URL or the sandbox scraper.",
		};
	}
}

export const fetchUrlTool: AgentTool<FetchUrlArgs, FetchUrlResult> = {
	name: "fetch_url",
	description:
		"Fetches a web page or JSON/text endpoint and returns its readable content as plain text. Use this for quick page reads (articles, docs, raw JSON/APIs) without spinning up the sandbox. It does not execute JavaScript and returns server-rendered content only; for JS-heavy sites or authenticated scraping use execute_code.",
	parameters: {
		type: "OBJECT",
		properties: {
			url: {
				type: "STRING",
				description: "The absolute http(s) URL to fetch.",
			},
			maxChars: {
				type: "INTEGER",
				description:
					"Optional maximum number of characters to return (default 6000, max 40000).",
			},
			timeoutMs: {
				type: "INTEGER",
				description:
					"Optional request timeout in milliseconds (default 15000).",
			},
		},
		required: ["url"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_FETCH_URL),
	execute: async (args: FetchUrlArgs, context?: ToolExecutionContext) => {
		return fetchUrl(args, context);
	},
};
