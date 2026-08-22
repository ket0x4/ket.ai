import { Wrench } from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshButton } from "@/components/common";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type { ToolTrace } from "@/types";

export const ToolTracesCard: FC = () => {
	const [traces, setTraces] = useState<ToolTrace[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const loadTraces = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await api.traces.get();
			setTraces(data.traces || []);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to fetch traces";
			toast.error(msg);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadTraces();
	}, [loadTraces]);

	return (
		<Card className="glass-card">
			<CardHeader className="pb-3 flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base sm:text-lg flex items-center gap-2">
						<Wrench className="w-5 h-5 text-purple-400" />
						<span>Tool Execution Traces</span>
					</CardTitle>
					<CardDescription>
						Recent Gemini function call invocations and subagent execution
						results.
					</CardDescription>
				</div>
				<RefreshButton onClick={loadTraces} isLoading={isLoading} />
			</CardHeader>

			<CardContent>
				<div className="rounded-xl border border-zinc-800 bg-black/90 p-3 sm:p-3.5 font-mono text-[11px] max-h-72 overflow-y-auto overflow-x-auto space-y-2.5">
					{isLoading && traces.length === 0 ? (
						<div className="text-zinc-500 py-4 text-center">
							Loading traces...
						</div>
					) : traces.length > 0 ? (
						traces.map((t) => (
							<div
								key={`${t.toolName}-${t.timestamp}`}
								className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1"
							>
								<div className="flex items-center justify-between text-xs">
									<span className="text-purple-400 font-bold font-mono">
										[{t.toolName}]
									</span>
									<span className="text-[10px] text-zinc-500">
										{new Date(t.timestamp).toLocaleTimeString()}
									</span>
								</div>
								<div className="text-zinc-300 text-[11px] break-words">
									<span className="text-zinc-500">Args: </span>
									{JSON.stringify(t.args)}
								</div>
								{t.result !== undefined && (
									<div className="text-emerald-400 text-[11px] break-words">
										<span className="text-zinc-500">Result: </span>
										{JSON.stringify(t.result)}
									</div>
								)}
							</div>
						))
					) : (
						<div className="text-zinc-500 py-4 text-center">
							No tool calls recorded in active session.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
