import { CONFIG } from "../../config";
import { ai } from "../../services/gemini/client";
import { runWithRetry } from "../../services/gemini/utils";
import logger from "../../utils/logger";
import type { AgentTool } from "../types";

interface SearchResult {
	title: string;
	snippet: string;
	url?: string;
}

interface WebSearchOutput {
	query: string;
	summary?: string;
	results: SearchResult[];
	count: number;
	search_queries?: string[];
	system_note?: string;
}

function buildSearchResults(
	chunks: Array<{ web?: { uri?: string; title?: string } }>,
	summary: string,
): SearchResult[] {
	const results: SearchResult[] = [];
	for (const chunk of chunks) {
		if (chunk.web?.uri) {
			results.push({
				title: chunk.web.title || "Web Source",
				snippet: summary.length > 300 ? `${summary.slice(0, 297)}...` : summary,
				url: chunk.web.uri,
			});
		}
	}

	if (results.length === 0 && summary) {
		results.push({
			title: "Google Search Result",
			snippet: summary,
		});
	}

	return results;
}

/**
 * Performs a web search using Gemini API with Google Search Grounding.
 */
async function performWebSearch(query: string): Promise<WebSearchOutput> {
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

	try {
		logger.info(
			`[WebSearchTool] Running Gemini Google Search for: "${trimmedQuery}"`,
		);

		const response = await runWithRetry(() =>
			ai.models.generateContent({
				model: CONFIG.GEMINI_MODEL,
				contents: `Search the web and provide accurate, up-to-date information for the following search query or URL. Include key facts, numbers, dates, or relevant details concisely:\n\nQuery: ${trimmedQuery}`,
				config: {
					tools: [{ googleSearch: {} }],
					temperature: 0.2,
				},
			}),
		);

		const summary = response.text?.trim() || "";
		const metadata = response.candidates?.[0]?.groundingMetadata;
		const searchQueries =
			metadata?.webSearchQueries || (trimmedQuery ? [trimmedQuery] : []);
		const results = buildSearchResults(
			metadata?.groundingChunks || [],
			summary,
		);

		logger.info(
			`[WebSearchTool] Gemini Search returned ${results.length} sources for query: "${trimmedQuery}"`,
		);

		const noResultsNote =
			results.length === 0 && !summary
				? "Search returned 0 results. Tell the user politely that no relevant information was found."
				: undefined;

		return {
			query: trimmedQuery,
			summary,
			results,
			count: results.length,
			search_queries: searchQueries,
			...(noResultsNote && { system_note: noResultsNote }),
		};
	} catch (error) {
		logger.error(
			"[WebSearchTool] Failed to execute Gemini Google Search:",
			error,
		);
		return {
			query: trimmedQuery,
			summary: "",
			results: [],
			count: 0,
			system_note:
				"Search engine error. Tell the user politely that you couldn't access search results at the moment.",
		};
	}
}

export const webSearchTool: AgentTool<{ query: string }, WebSearchOutput> = {
	name: "web_search",
	description:
		"Use this to search the internet or look up web URLs when current information, news, weather, stock prices, events, or webpage content are needed.",
	parameters: {
		type: "OBJECT",
		properties: {
			query: {
				type: "STRING",
				description: "The search query string or URL to look up",
			},
		},
		required: ["query"],
	},
	execute: async (args: { query: string }) => {
		return performWebSearch(args.query || "");
	},
};
