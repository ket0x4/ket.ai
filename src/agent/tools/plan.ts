import type { AgentTool, ToolExecutionContext } from "../types";

const MAX_PLAN_ITEMS = 20;
const MAX_TITLE_CHARS = 200;
const MAX_TRACKED_SESSIONS = 200;

// In-memory, per-session working plan. The agent loop reads this to keep a
// long task on-rails and to expose progress to the model each step. Scoped to
// the process; sessions are bounded to avoid unbounded growth.
const plans = new Map<string, string[]>();

function resolveSessionId(
	context?: ToolExecutionContext,
	argsSessionId?: string,
): string {
	return context?.sessionId || argsSessionId || "default";
}

function normalizeItems(items: unknown): string[] {
	if (!Array.isArray(items)) return [];
	return items
		.map((item) =>
			typeof item === "string"
				? item.trim().slice(0, MAX_TITLE_CHARS)
				: typeof item === "object" && item && "title" in item
					? String((item as { title?: unknown }).title ?? "")
							.trim()
							.slice(0, MAX_TITLE_CHARS)
					: "",
		)
		.filter(Boolean)
		.slice(0, MAX_PLAN_ITEMS);
}

export function setPlan(sessionId: string, items: unknown): string[] {
	const clean = normalizeItems(items);
	if (clean.length === 0) {
		plans.delete(sessionId);
		return [];
	}
	if (plans.size >= MAX_TRACKED_SESSIONS && !plans.has(sessionId)) {
		const firstKey = plans.keys().next().value;
		if (firstKey) plans.delete(firstKey);
	}
	plans.set(sessionId, clean);
	return clean;
}

export function getPlan(sessionId: string): string[] {
	return plans.get(sessionId) ?? [];
}

export function clearPlan(sessionId: string): void {
	plans.delete(sessionId);
}

interface UpdatePlanArgs {
	items: string[];
	sessionId?: string;
}

interface UpdatePlanResult {
	success: boolean;
	plan: string[];
	system_note?: string;
}

export const updatePlanTool: AgentTool<UpdatePlanArgs, UpdatePlanResult> = {
	name: "update_plan",
	description:
		"Records or updates your working plan (an ordered list of short step titles) for the current multi-step task. Call this once at the start of any task that needs more than one or two tool calls, and again whenever the plan changes. Pass an empty list to clear the plan when the task is done. Keeping the plan current helps you stay on track across steps.",
	parameters: {
		type: "OBJECT",
		properties: {
			items: {
				type: "ARRAY",
				description:
					"Ordered list of concise step titles, e.g. ['Fetch the dataset', 'Clean missing rows', 'Plot a bar chart', 'Send the chart']. Pass [] to clear.",
				items: { type: "STRING" },
			},
		},
		required: ["items"],
	},
	execute: async (args: UpdatePlanArgs, context?: ToolExecutionContext) => {
		const sessionId = resolveSessionId(context, args.sessionId);
		const plan = setPlan(sessionId, args.items);
		return {
			success: true,
			plan,
			system_note:
				plan.length > 0
					? `Plan recorded with ${plan.length} step(s). Follow it in order and update it as you progress.`
					: "Plan cleared.",
		};
	},
};
