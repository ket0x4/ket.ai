import { expect, test } from "bun:test";
import { AgentStateMachine } from "../src/agent/fsm";

test("AgentStateMachine happy path transition flow", () => {
	const fsm = new AgentStateMachine("test_trace_123");

	expect(fsm.getState()).toBe("IDLE");
	expect(fsm.getTraceId()).toBe("test_trace_123");
	expect(fsm.getStep()).toBe(0);

	fsm.transition("INITIALIZING");
	expect(fsm.getState()).toBe("INITIALIZING");

	fsm.transition("CALLING_MODEL");
	expect(fsm.getState()).toBe("CALLING_MODEL");

	const step1 = fsm.incrementStep();
	expect(step1).toBe(1);

	fsm.transition("EXECUTING_TOOLS", { toolCount: 1 });
	expect(fsm.getState()).toBe("EXECUTING_TOOLS");

	fsm.transition("CALLING_MODEL");
	expect(fsm.getState()).toBe("CALLING_MODEL");

	fsm.transition("PARSING_RESPONSE");
	expect(fsm.getState()).toBe("PARSING_RESPONSE");

	fsm.transition("PERSISTING_DATA");
	expect(fsm.getState()).toBe("PERSISTING_DATA");

	fsm.transition("COMPLETED");
	expect(fsm.getState()).toBe("COMPLETED");
	expect(fsm.isTerminal()).toBe(true);
});

test("AgentStateMachine throws and fails on invalid transition", () => {
	const fsm = new AgentStateMachine();

	expect(fsm.getState()).toBe("IDLE");

	// Direct transition from IDLE to COMPLETED is invalid
	expect(() => {
		fsm.transition("COMPLETED");
	}).toThrow(/Invalid state transition requested/);

	expect(fsm.getState()).toBe("FAILED");
	expect(fsm.isTerminal()).toBe(true);
	expect(fsm.getError()).not.toBeNull();
});

test("AgentStateMachine supports transitions from EXECUTING_TOOLS when max steps reached", () => {
	const fsm = new AgentStateMachine();
	fsm.transition("INITIALIZING");
	fsm.transition("CALLING_MODEL");
	fsm.transition("EXECUTING_TOOLS");
	expect(fsm.getState()).toBe("EXECUTING_TOOLS");

	// Can transition directly to PARSING_RESPONSE or COMPLETED
	fsm.transition("PARSING_RESPONSE");
	expect(fsm.getState()).toBe("PARSING_RESPONSE");

	fsm.transition("COMPLETED");
	expect(fsm.getState()).toBe("COMPLETED");
	expect(fsm.isTerminal()).toBe(true);
});

test("AgentStateMachine fail() transitions to FAILED and records error", () => {
	const fsm = new AgentStateMachine();
	fsm.transition("INITIALIZING");

	const testError = new Error("Network timeout during model call");
	fsm.fail(testError);

	expect(fsm.getState()).toBe("FAILED");
	expect(fsm.isTerminal()).toBe(true);
	expect(fsm.getError()).toBe(testError);
});
