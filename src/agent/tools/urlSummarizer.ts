import logger from "../../utils/logger";
import type { AgentTool } from "../types";

interface PageSummaryResult {
	url: string;
	title?: string;
	content: string;
	length: number;
	error?: string;
}

/**
 * Strips script, style, navigation, header, and footer tags, then extracts clean text.
 */
function extractCleanText(html: string): { title: string; content: string } {
	if (!html) return { title: "", content: "" };

	// 1. Extract title if present
	let title = "";
	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (titleMatch?.[1]) {
		title = titleMatch[1]
			.replace(/<[^>]+>/g, "")
			.replace(/\s+/g, " ")
			.trim();
	}

	// 2. Remove script, style, nav, header, footer, svg tags
	let cleaned = html
		.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
		.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
		.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, "")
		.replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, "")
		.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, "")
		.replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, "")
		.replace(/<form[^>]*>([\s\S]*?)<\/form>/gi, "");

	// 3. Convert break/paragraph tags to newlines
	cleaned = cleaned
		.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr)>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n");

	// 4. Strip all remaining HTML tags
	cleaned = cleaned.replace(/<[^>]+>/g, "");

	// 5. Decode common HTML entities
	cleaned = cleaned
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");

	// 6. Normalize multiline whitespace and trim
	const lines = cleaned
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const textContent = lines.join("\n");

	return { title, content: textContent };
}

/**
 * Fetches content from a web URL and extracts clean readable text.
 * Token-optimized: limits total content length to max ~2500 characters.
 */
async function fetchPageContent(
	urlInput: string,
	maxLength = 2500,
): Promise<PageSummaryResult> {
	let validUrl: URL;
	try {
		const formattedUrl =
			urlInput.startsWith("http://") || urlInput.startsWith("https://")
				? urlInput
				: `https://${urlInput}`;
		validUrl = new URL(formattedUrl);
	} catch {
		logger.warn(`[UrlSummarizer] Invalid URL provided: "${urlInput}"`);
		return {
			url: urlInput,
			content: "",
			length: 0,
			error: "Invalid URL provided.",
		};
	}

	const targetUrl = validUrl.toString();

	try {
		logger.info(`[UrlSummarizer] Fetching URL content for: ${targetUrl}`);

		const response = await fetch(targetUrl, {
			method: "GET",
			signal: AbortSignal.timeout(3000),
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
			},
		});

		if (!response.ok) {
			logger.warn(
				`[UrlSummarizer] HTTP status ${response.status} when fetching ${targetUrl}`,
			);
			return {
				url: targetUrl,
				content: "",
				length: 0,
				error: `HTTP Error ${response.status}: Failed to load web page.`,
			};
		}

		const contentType = response.headers.get("content-type") || "";
		if (
			!contentType.includes("text") &&
			!contentType.includes("json") &&
			!contentType.includes("xml")
		) {
			logger.warn(`[UrlSummarizer] Unsupported content type: ${contentType}`);
			return {
				url: targetUrl,
				content: "",
				length: 0,
				error: `Unsupported page content type: ${contentType}`,
			};
		}

		const rawHtml = await response.text();
		const { title, content } = extractCleanText(rawHtml);

		// Token optimization: limit content length
		const trimmedContent =
			content.length > maxLength
				? content.slice(0, maxLength) +
					"\n\n[...Text continues, truncated for token efficiency]"
				: content;

		logger.info(
			`[UrlSummarizer] Extracted ${trimmedContent.length} chars from ${targetUrl}`,
		);

		return {
			url: targetUrl,
			title: title || undefined,
			content: trimmedContent,
			length: trimmedContent.length,
		};
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		logger.error(
			`[UrlSummarizer] Failed to fetch page content for ${targetUrl}:`,
			err,
		);
		return {
			url: targetUrl,
			content: "",
			length: 0,
			error: err.message || "Failed to fetch webpage content.",
		};
	}
}

export const urlSummarizerTool: AgentTool<{ url: string }, PageSummaryResult> =
	{
		name: "url_summarizer",
		description:
			"ONLY use this when the user explicitly sends a 'URL (link)' for you to analyze or summarize. Do not use this tool if the user did not send a link or if the content of the link is already known.",
		parameters: {
			type: "OBJECT",
			properties: {
				url: {
					type: "STRING",
					description:
						"The web page URL to fetch and summarize (e.g. 'https://example.com/article').",
				},
			},
			required: ["url"],
		},
		execute: async (args: { url: string }) => {
			const url = args.url?.trim() || "";
			if (!url) {
				return { url: "", content: "", length: 0, error: "No URL provided." };
			}

			return await fetchPageContent(url);
		},
	};
