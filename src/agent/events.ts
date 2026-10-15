import logger from "../utils/logger";
import type { GeneratedMediaArtifact, ToolProgressUpdate } from "./types";

/**
 * Everything the agent loop reports back to the caller while it works.
 * A single discriminated union replaces the previous trio of ad-hoc callbacks
 * (onToolCall / onToolProgress / onMediaGenerated).
 */
export type AgentEvent =
	| {
			type: "tool-call";
			toolName: string;
			args: Record<string, unknown>;
			step: number;
	  }
	| {
			type: "tool-progress";
			toolName: string;
			progress: ToolProgressUpdate;
			step: number;
	  }
	| {
			type: "media-generated";
			media: GeneratedMediaArtifact[];
	  }
	| {
			type: "step-start";
			step: number;
			maxSteps: number;
	  }
	| {
			type: "step-complete";
			step: number;
			toolCount: number;
			suppressedCount: number;
	  }
	| {
			type: "loop-detected";
			toolName: string;
			step: number;
			reason: string;
	  };

export type AgentEventHandler = (event: AgentEvent) => void | Promise<void>;

/**
 * Combines several handlers into a single emitter. Handlers run in order and a
 * failure in one is logged but never interrupts tool execution or the others.
 */
export function mergeAgentEventHandlers(
	...handlers: Array<AgentEventHandler | undefined>
): AgentEventHandler {
	const active = handlers.filter((h): h is AgentEventHandler => Boolean(h));
	return async (event: AgentEvent) => {
		for (const handler of active) {
			try {
				await handler(event);
			} catch (err) {
				logger.warn(`[Agent] Error in event handler for '${event.type}':`, err);
			}
		}
	};
}
