import { Wrench } from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshButton } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					<Wrench className="h-4 w-4 text-muted-foreground" />
					Tool traces
				</CardTitle>
				<RefreshButton
					onClick={loadTraces}
					isLoading={isLoading}
					size="icon"
					label=""
				/>
			</CardHeader>

			<CardContent>
				<div className="max-h-72 space-y-2 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[11px]">
					{isLoading && traces.length === 0 ? (
						<div className="py-4 text-center text-muted-foreground">
							Loading…
						</div>
					) : traces.length > 0 ? (
						traces.map((t) => (
							<div
								key={`${t.toolName}-${t.timestamp}`}
								className="space-y-1 rounded-lg border border-border/60 p-2.5"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-bold text-primary">{t.toolName}</span>
									<span className="text-[10px] text-muted-foreground">
										{new Date(t.timestamp).toLocaleTimeString()}
									</span>
								</div>
								<div className="break-words text-foreground/70">
									<span className="text-muted-foreground">args </span>
									{JSON.stringify(t.args)}
								</div>
								{t.result !== undefined && (
									<div className="break-words text-emerald-400/90">
										<span className="text-muted-foreground">result </span>
										{JSON.stringify(t.result)}
									</div>
								)}
							</div>
						))
					) : (
						<div className="py-4 text-center text-muted-foreground">
							No tool calls recorded.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
