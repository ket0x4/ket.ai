import { Terminal } from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshButton, SearchInput } from "@/components/common";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { LogEntry } from "@/types";

const LOG_LEVELS = ["ALL", "INFO", "WARN", "ERROR"] as const;

export const LiveLogsCard: FC = () => {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [logType, setLogType] = useState<"app" | "error">("app");
	const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");
	const [logSearch, setLogSearch] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const loadLogs = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await api.logs.get({
				type: logType,
				level: logLevelFilter,
				search: logSearch,
			});
			setLogs(data.logs || []);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to fetch logs";
			toast.error(msg);
		} finally {
			setIsLoading(false);
		}
	}, [logType, logLevelFilter, logSearch]);

	useEffect(() => {
		loadLogs();
	}, [loadLogs]);

	return (
		<Card className="glass-card">
			<CardHeader className="pb-3 flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base sm:text-lg flex items-center gap-2">
						<Terminal className="w-5 h-5 text-emerald-400" />
						<span>Logs</span>
					</CardTitle>
					<CardDescription>
						Real-time structured logs from application and error handlers.
					</CardDescription>
				</div>
				<RefreshButton onClick={loadLogs} isLoading={isLoading} />
			</CardHeader>

			<CardContent className="space-y-3">
				<div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between text-xs">
					<div className="flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border/50">
						{LOG_LEVELS.map((lvl) => (
							<button
								type="button"
								key={lvl}
								onClick={() => setLogLevelFilter(lvl)}
								className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
									logLevelFilter === lvl
										? "bg-primary text-primary-foreground shadow"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{lvl}
							</button>
						))}
					</div>

					<div className="flex items-center gap-2">
						<Select
							value={logType}
							onValueChange={(val) => setLogType(val as "app" | "error")}
						>
							<SelectTrigger className="w-32 bg-background/50 h-8 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="app">app.log</SelectItem>
								<SelectItem value="error">error.log</SelectItem>
							</SelectContent>
						</Select>

						<SearchInput
							placeholder="Filter log text..."
							value={logSearch}
							onChange={setLogSearch}
							containerClassName="sm:w-48"
							className="h-8 text-xs bg-background/50"
						/>
					</div>
				</div>

				<div className="rounded-xl border border-zinc-800 bg-black/90 p-3 sm:p-3.5 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto overflow-x-auto space-y-1 text-zinc-300">
					{isLoading && logs.length === 0 ? (
						<div className="text-zinc-500 py-4 text-center">
							Loading log lines...
						</div>
					) : logs.length > 0 ? (
						logs.map((l) => {
							const lvl = (l.level || "INFO").toUpperCase();
							const lvlColor =
								lvl === "ERROR"
									? "text-rose-400 bg-rose-500/10 border-rose-500/30"
									: lvl === "WARN"
										? "text-amber-400 bg-amber-500/10 border-amber-500/30"
										: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";

							return (
								<div
									key={`${l.timestamp}-${l.message}`}
									className="flex items-start gap-2 break-all hover:bg-white/5 p-1 rounded"
								>
									<span
										className={`px-1.5 py-0.5 rounded border text-[9px] sm:text-[10px] font-bold shrink-0 ${lvlColor}`}
									>
										{lvl}
									</span>
									<span className="text-zinc-200 break-words whitespace-pre-wrap flex-1">
										{l.message}
									</span>
								</div>
							);
						})
					) : (
						<div className="text-zinc-500 py-4 text-center">
							No matching log entries found.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
