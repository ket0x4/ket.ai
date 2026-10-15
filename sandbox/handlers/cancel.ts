import { executions } from "../lib/execution";

export async function handleCancel(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { executionId?: string };
		const executionId = body.executionId?.trim();
		if (!executionId) {
			return Response.json(
				{ success: false, error: "Missing 'executionId'" },
				{ status: 400 },
			);
		}

		const execution = executions.get(executionId);
		if (!execution) {
			return Response.json(
				{ success: false, error: "Execution not found or already completed." },
				{ status: 404 },
			);
		}
		if (execution.status === "completed" || execution.status === "failed") {
			return Response.json({
				success: false,
				executionId,
				status: execution.status,
				error: "Execution is already finished.",
			});
		}

		execution.status = "cancelled";
		execution.cancelRequested = true;
		execution.cancel?.();
		return Response.json({
			success: true,
			executionId,
			status: "cancelled",
			message: execution.cancel
				? "Cancellation requested."
				: "Cancellation queued; execution has not started yet.",
		});
	} catch (error) {
		return Response.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 400 },
		);
	}
}
