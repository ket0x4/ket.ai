import logger from "../utils/logger";

type AgentState =
	| "IDLE"
	| "INITIALIZING"
	| "CALLING_MODEL"
	| "EXECUTING_TOOLS"
	| "PARSING_RESPONSE"
	| "PERSISTING_DATA"
	| "COMPLETED"
	| "FAILED";

interface StateTransitionEvent {
	from: AgentState;
	to: AgentState;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

const ALLOWED_TRANSITIONS: Record<AgentState, AgentState[]> = {
	IDLE: ["INITIALIZING", "FAILED"],
	INITIALIZING: ["CALLING_MODEL", "FAILED"],
	CALLING_MODEL: ["EXECUTING_TOOLS", "PARSING_RESPONSE", "FAILED"],
	EXECUTING_TOOLS: ["CALLING_MODEL", "PARSING_RESPONSE", "COMPLETED", "FAILED"],
	PARSING_RESPONSE: ["PERSISTING_DATA", "COMPLETED", "FAILED"],
	PERSISTING_DATA: ["COMPLETED", "FAILED"],
	COMPLETED: [],
	FAILED: [],
};

/**
 * Finite State Machine (FSM) managing the turn lifecycle of the Gemini Agent.
 * Ensures deterministic flow, avoids stuck or invalid transitions, and tags every step with a unique trace ID.
 */
export class AgentStateMachine {
	private currentState: AgentState = "IDLE";
	private readonly traceId: string;
	private stepCount = 0;
	private lastError: unknown = null;
	private readonly history: StateTransitionEvent[] = [];

	constructor(customTraceId?: string) {
		this.traceId =
			customTraceId ||
			`trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
	}

	public getTraceId(): string {
		return this.traceId;
	}

	public getState(): AgentState {
		return this.currentState;
	}

	public getStep(): number {
		return this.stepCount;
	}

	public incrementStep(): number {
		this.stepCount += 1;
		return this.stepCount;
	}

	public getError(): unknown {
		return this.lastError;
	}

	public isTerminal(): boolean {
		return this.currentState === "COMPLETED" || this.currentState === "FAILED";
	}

	public transition(
		toState: AgentState,
		metadata?: Record<string, unknown>,
	): void {
		if (this.currentState === toState) {
			return;
		}

		const allowed = ALLOWED_TRANSITIONS[this.currentState];
		if (!allowed?.includes(toState)) {
			const errorMsg = `[FSM] Invalid state transition requested: ${this.currentState} -> ${toState} (Trace: ${this.traceId})`;
			logger.error(errorMsg);
			this.currentState = "FAILED";
			this.lastError = new Error(errorMsg);
			throw new Error(errorMsg);
		}

		const prev = this.currentState;
		this.currentState = toState;
		this.history.push({
			from: prev,
			to: toState,
			timestamp: Date.now(),
			metadata,
		});

		logger.debug(
			`[FSM:${this.traceId}] Transition: ${prev} -> ${toState}${metadata ? ` | Meta: ${JSON.stringify(metadata)}` : ""}`,
		);
	}

	public fail(error: unknown, metadata?: Record<string, unknown>): void {
		this.lastError = error;
		if (this.currentState !== "FAILED") {
			const prev = this.currentState;
			this.currentState = "FAILED";
			this.history.push({
				from: prev,
				to: "FAILED",
				timestamp: Date.now(),
				metadata: {
					...metadata,
					error: error instanceof Error ? error.message : String(error),
				},
			});
			logger.warn(
				`[FSM:${this.traceId}] Flow transitioned to FAILED from ${prev}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
