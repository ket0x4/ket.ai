import type { AgentTool } from "../types";
import logger from "../../utils/logger";

export interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
}

/**
 * Decodes basic HTML entities and removes HTML tags.
 */
function cleanHtmlText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "") // strip HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Perform a web search using DuckDuckGo HTML.
 * Token-optimized: returns top results with trimmed snippets.
 */
export async function performWebSearch(
  query: string,
  maxResults = 4,
): Promise<SearchResult[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      logger.warn(`[WebSearch] DuckDuckGo HTTP status: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Match DDG HTML result blocks
    // Pattern matches result titles and snippets
    const resultBlockRegex =
      /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>)/g;

    let match: RegExpExecArray | null;
    while (
      (match = resultBlockRegex.exec(html)) !== null &&
      results.length < maxResults
    ) {
      const rawUrl = match[1] || "";
      const rawTitle = match[2] || "";
      const rawSnippet = match[3] || match[4] || "";

      const title = cleanHtmlText(rawTitle);
      const snippet = cleanHtmlText(rawSnippet);

      // Clean DDG redirect URL if present
      let url = rawUrl;
      const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
      if (uddgMatch && uddgMatch[1]) {
        try {
          url = decodeURIComponent(uddgMatch[1]);
        } catch {
          url = rawUrl;
        }
      }

      if (title && snippet) {
        results.push({
          title,
          // Token efficiency: Limit snippet length to ~150 characters
          snippet:
            snippet.length > 150 ? snippet.slice(0, 147) + "..." : snippet,
          url: url.startsWith("http") ? url : undefined,
        });
      }
    }

    // Fallback: If primary regex missed, try simple link/snippet extraction
    if (results.length === 0) {
      const titleMatches = [
        ...html.matchAll(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/g),
      ];
      const snippetMatches = [
        ...html.matchAll(
          /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g,
        ),
      ];

      for (
        let i = 0;
        i < Math.min(titleMatches.length, snippetMatches.length, maxResults);
        i++
      ) {
        const title = cleanHtmlText(titleMatches[i][1]);
        const snippet = cleanHtmlText(snippetMatches[i][1]);
        if (title && snippet) {
          results.push({
            title,
            snippet:
              snippet.length > 150 ? snippet.slice(0, 147) + "..." : snippet,
          });
        }
      }
    }

    // DEBUGGING: If still 0 results, log what DuckDuckGo actually gave us
    if (results.length === 0) {
      logger.warn(`[WebSearch] 0 results found! HTTP Status: ${response.status}`);
      logger.warn(`[WebSearch] HTML snippet: ${html.substring(0, 300)}`);
    }

    return results;
  } catch (error) {
    logger.error("[WebSearch] Failed to fetch or parse search results:", error);
    return [];
  }
}

export const webSearchTool: AgentTool<
  { query: string },
  { query: string; results: SearchResult[]; count: number; system_note?: string }
> = {
  name: "web_search",
  description: "ONLY use this to search the internet when the user specifically asks for current information, news, weather, stock prices, or an instant event not in your training data. DO NOT USE it for general chat or when the answer is already in previous conversations.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The search query string",
      },
    },
    required: ["query"],
  },
  execute: async (args: { query: string }) => {
    const query = args.query?.trim() || "";
    if (!query) {
      return { query, results: [], count: 0, system_note: "Empty query provided." };
    }

    logger.info(`[WebSearchTool] Running web search for query: "${query}"`);
    const results = await performWebSearch(query);
    logger.info(
      `[WebSearchTool] Found ${results.length} results for query: "${query}"`,
    );

    return {
      query,
      results,
      count: results.length,
      ...(results.length === 0 && {
        system_note: "Search engine returned 0 results (likely blocked by anti-bot protection). Tell the user politely that you couldn't access the internet right now."
      })
    };
  },
};
