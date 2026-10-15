/**
 * Parses stderr and exit code to provide intelligent self-healing hints for the LLM agent.
 */
export function generateErrorHint(
	stderr: string,
	exitCode: number,
): string | undefined {
	if (exitCode === 0 && !stderr) return undefined;

	// 1. Missing Python module
	const moduleMatch = stderr.match(
		/ModuleNotFoundError: No module named '([a-zA-Z0-9_.-]+)'/,
	);
	if (moduleMatch) {
		return `Hint: Python module '${moduleMatch[1]}' is missing. You can pass packages: ['${moduleMatch[1]}'] in your tool arguments to auto-install it.`;
	}

	// 2. Missing JS/TS package
	const jsModuleMatch = stderr.match(
		/(?:Cannot find module|Cannot find package) '([a-zA-Z0-9_@/.-]+)'/,
	);
	if (jsModuleMatch) {
		return `Hint: Package '${jsModuleMatch[1]}' is missing. You can pass packages: ['${jsModuleMatch[1]}'] in your tool arguments to auto-install it.`;
	}

	// 3. Syntax error
	const syntaxMatch = stderr.match(/SyntaxError: (.*)/);
	if (syntaxMatch) {
		return `Hint: Python SyntaxError detected (${syntaxMatch[1]}). Please verify your script syntax and indentation.`;
	}

	// 4. Timeout & Playwright Timeout
	if (
		exitCode === 124 ||
		stderr.includes("timed out") ||
		stderr.includes("TimeoutError: Page.goto") ||
		stderr.includes("TimeoutError: Locator") ||
		stderr.includes("playwright._impl._errors.TimeoutError")
	) {
		if (
			stderr.includes("playwright") ||
			stderr.includes("Locator") ||
			stderr.includes("Page.goto") ||
			stderr.includes("waiting for locator")
		) {
			return "Hint: Playwright page navigation or selector wait timed out. Consider using wait_until='domcontentloaded', increasing timeout, or checking if target selectors are present.";
		}
		return "Hint: Script execution timed out. If performing web scraping or heavy computation, consider reducing loops or queries.";
	}

	// 5. Anti-Bot / HTTP 403 / 429 / Cloudflare
	if (
		stderr.includes("403 Forbidden") ||
		stderr.includes("HTTPError: 403") ||
		stderr.includes("429 Too Many Requests") ||
		stderr.includes("Cloudflare") ||
		stderr.includes("Just a moment...") ||
		stderr.includes("Enable JavaScript and cookies to continue")
	) {
		return "Hint: Target website blocked the request (403/429/Cloudflare Bot Protection). Try using 'curl_cffi' (with impersonate='chrome') or 'playwright' with stealth mode and realistic browser headers instead of standard requests.";
	}

	// 6. JSON / Data Parsing / KeyError / IndexError
	if (
		stderr.includes("JSONDecodeError") ||
		stderr.includes("Unexpected token < in JSON") ||
		stderr.includes("SyntaxError: Unexpected token")
	) {
		return "Hint: JSON parsing failed. The server likely returned an HTML error or captcha page instead of JSON. Print and inspect the raw response body first.";
	}
	if (stderr.match(/KeyError: (.*)/)) {
		return "Hint: KeyError detected. The dictionary key does not exist. Use dict.get('key') with a default fallback or inspect available keys with print(data.keys()).";
	}
	if (stderr.includes("IndexError: list index out of range")) {
		return "Hint: IndexError detected. The parsed list or elements array is empty. Verify that your CSS/XPath selector or regex actually matched elements.";
	}

	// 7. FileNotFoundError
	if (
		stderr.includes("FileNotFoundError") ||
		stderr.includes("ENOENT: no such file or directory")
	) {
		return "Hint: File or directory was not found. Use list_workspace_files to see existing files or write output files using relative paths.";
	}

	// 8. NameError
	const nameMatch = stderr.match(
		/NameError: name '([a-zA-Z0-9_]+)' is not defined/,
	);
	if (nameMatch) {
		return `Hint: Variable or function '${nameMatch[1]}' is not defined before use.`;
	}

	// 9. Memory limit / OOM
	if (
		exitCode === 137 ||
		stderr.includes("MemoryError") ||
		stderr.includes("heap out of memory")
	) {
		return "Hint: Process exceeded memory quota (1.5GB) and was terminated. Process data in chunks (e.g. chunksize in pandas/polars) to avoid loading entire datasets into memory.";
	}

	return undefined;
}
