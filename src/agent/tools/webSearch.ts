import { CONFIG } from "../../config";
import { getOpenAiClient } from "../../services/llm/client";
import { runApiCall } from "../../services/llm/middleware";
import logger from "../../utils/logger";
import type { AgentTool, ToolExecutionContext } from "../types";

interface SearchResult {
	title: string;
	snippet?: string;
	url?: string;
}

interface WebSearchOutput {
	query: string;
	summary?: string;
	results: SearchResult[];
	count: number;
	search_queries?: string[];
	cached?: boolean;
	system_note?: string;
}

interface CacheEntry {
	output: WebSearchOutput;
	timestamp: number;
}

const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_CACHE_ENTRIES = 50;
const searchCache = new Map<string, CacheEntry>();

function getCachedSearch(normalizedQuery: string): WebSearchOutput | null {
	const entry = searchCache.get(normalizedQuery);
	if (!entry) return null;
	if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL_MS) {
		searchCache.delete(normalizedQuery);
		return null;
	}
	return { ...entry.output, cached: true };
}

function setCachedSearch(
	normalizedQuery: string,
	output: WebSearchOutput,
): void {
	if (searchCache.size >= MAX_CACHE_ENTRIES) {
		const firstKey = searchCache.keys().next().value;
		if (firstKey) searchCache.delete(firstKey);
	}
	searchCache.set(normalizedQuery, {
		output,
		timestamp: Date.now(),
	});
}

function buildSearchResults(
	annotations: Array<{ url?: string; title?: string }>,
	summary: string,
): SearchResult[] {
	const results: SearchResult[] = [];
	const seen = new Set<string>();
	for (const annotation of annotations) {
		const url = annotation.url;
		if (url && !seen.has(url)) {
			seen.add(url);
			results.push({
				title: annotation.title || "Web Source",
				url,
			});
		}
	}

	if (results.length === 0 && summary) {
		results.push({
			title: "Web Search Result",
			snippet: summary,
		});
	}

	return results;
}

/** Collects url citation annotations from one output_text content block. */
function collectContentAnnotations(
	content: {
		type?: string;
		annotations?: Array<{ type?: string; url?: string; title?: string }>;
	},
	annotations: Array<{ url?: string; title?: string }>,
): void {
	if (content?.type !== "output_text") return;
	for (const annotation of content.annotations ?? []) {
		if (annotation?.url) {
			annotations.push({ url: annotation.url, title: annotation.title });
		}
	}
}

/** Collects url citations from the Responses API output message contents. */
function collectCitations(output: unknown[]): Array<{
	url?: string;
	title?: string;
}> {
	const annotations: Array<{ url?: string; title?: string }> = [];
	for (const item of output) {
		const message = item as {
			type?: string;
			content?: Array<{
				type?: string;
				annotations?: Array<{
					type?: string;
					url?: string;
					title?: string;
				}>;
			}>;
		};
		if (message?.type !== "message" || !Array.isArray(message.content)) {
			continue;
		}
		for (const content of message.content) {
			collectContentAnnotations(content, annotations);
		}
	}
	return annotations;
}

/**
 * Performs a web search using the OpenAI Responses API web search tool and
 * in-memory caching.
 */
async function performWebSearch(
	query: string,
	signal?: AbortSignal,
): Promise<WebSearchOutput> {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return {
			query: "",
			summary: "",
			results: [],
			count: 0,
			system_note: "Empty query provided.",
		};
	}

	const normalizedKey = trimmedQuery.toLowerCase();
	const cached = getCachedSearch(normalizedKey);
	if (cached) {
		logger.debug(
			`[WebSearchTool] Cache HIT for query: "${trimmedQuery}" (${cached.results.length} sources)`,
		);
		return cached;
	}

	try {
		logger.info(`[WebSearchTool] Running web search for: "${trimmedQuery}"`);

		const response = await runApiCall(
			() =>
				getOpenAiClient().responses.create(
					{
						model: CONFIG.OPENAI_MODEL,
						tools: [{ type: "web_search" }],
						input: `Search the web and provide concise, accurate facts, numbers, and dates for: ${trimmedQuery}`,
					},
					{ signal },
				),
			{ baseDelayMs: 2000, logLabel: "OpenAI:websearch" },
		);

		const summary = (response.output_text || "").trim();
		const citations = collectCitations(response.output ?? []);
		const results = buildSearchResults(citations, summary);

		logger.info(
			`[WebSearchTool] Web search returned ${results.length} sources for query: "${trimmedQuery}"`,
		);

		const noResultsNote =
			results.length === 0 && !summary
				? "Search returned 0 results."
				: undefined;

		const output: WebSearchOutput = {
			query: trimmedQuery,
			summary,
			results,
			count: results.length,
			search_queries: [trimmedQuery],
			...(noResultsNote && { system_note: noResultsNote }),
		};

		setCachedSearch(normalizedKey, output);
		return output;
	} catch (error) {
		logger.error("[WebSearchTool] Failed to execute web search:", error);
		return {
			query: trimmedQuery,
			summary: "",
			results: [],
			count: 0,
			system_note: "Search engine error.",
		};
	}
}

export const webSearchTool: AgentTool<{ query: string }, WebSearchOutput> = {
	name: "web_search",
	description: "Search the web for current events, news, prices, or facts.",
	parameters: {
		type: "OBJECT",
		properties: {
			query: {
				type: "STRING",
				description: "Search query.",
			},
		},
		required: ["query"],
	},
	isEnabled: () => Boolean(CONFIG.ENABLE_WEB_SEARCH),
	execute: async (args: { query: string }, context?: ToolExecutionContext) => {
		return performWebSearch(args.query || "", context?.signal);
	},
};
