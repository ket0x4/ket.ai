import type { SandboxExecuteResponse, SandboxStreamEvent } from "./contracts";

function parseSseFrame(raw: string): SandboxStreamEvent | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	let type = "message";
	let text = "";
	for (const line of trimmed.split("\n")) {
		if (line.startsWith("event: ")) type = line.slice(7).trim();
		else if (line.startsWith("data: ")) text = line.slice(6);
	}

	let data: unknown = text;
	try {
		data = JSON.parse(text);
	} catch {
		// SSE data is allowed to be plain text.
	}

	return { type, text, data };
}

// SSE parsing intentionally handles framing, decoding, and terminal-result state
// in one place so JSON and streaming clients share identical wire semantics.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: centralizes SSE framing state
export async function readSseStream(
	body: ReadableStream<Uint8Array>,
	onEvent: (event: SandboxStreamEvent) => void,
): Promise<SandboxExecuteResponse | undefined> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let result: SandboxExecuteResponse | undefined;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;

			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split("\n\n");
			buffer = parts.pop() || "";
			for (const part of parts) {
				const event = parseSseFrame(part);
				if (!event) continue;
				onEvent(event);
				if (event.type === "result" && event.data) {
					result = event.data as SandboxExecuteResponse;
				}
			}
		}

		buffer += decoder.decode();
		const finalEvent = parseSseFrame(buffer);
		if (finalEvent) {
			onEvent(finalEvent);
			if (finalEvent.type === "result" && finalEvent.data) {
				result = finalEvent.data as SandboxExecuteResponse;
			}
		}
	} finally {
		reader.releaseLock();
	}

	return result;
}
