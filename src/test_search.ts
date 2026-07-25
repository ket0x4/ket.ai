import { performWebSearch } from "./agent/tools/webSearch";

async function run() {
  console.log("Starting web search test...");
  const results = await performWebSearch("test search query");
  console.log("Results count:", results.length);
  if (results.length === 0) {
    console.log("Got 0 results! Let's fetch manually to see what DDG is returning.");
    const searchUrl = `https://html.duckduckgo.com/html/?q=test`;
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
    console.log("HTTP Status:", response.status);
    const html = await response.text();
    console.log("HTML Snippet:", html.substring(0, 500));
  } else {
    console.log("Results:", results);
  }
}

run();
