import { Terminal } from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshButton, SearchInput } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
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
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					<Terminal className="h-4 w-4 text-muted-foreground" />
					Logs
				</CardTitle>
				<RefreshButton
					onClick={loadLogs}
					isLoading={isLoading}
					size="icon"
					label=""
				/>
			</CardHeader>

			<CardContent className="space-y-3">
				<div className="flex flex-col items-stretch justify-between gap-2.5 text-xs sm:flex-row sm:items-center">
					<div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
						{LOG_LEVELS.map((lvl) => (
							<button
								type="button"
								key={lvl}
								onClick={() => setLogLevelFilter(lvl)}
								className={cn(
									"rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
									logLevelFilter === lvl
										? "bg-accent text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
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
							<SelectTrigger className="h-8 w-32 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="app">app.log</SelectItem>
								<SelectItem value="error">error.log</SelectItem>
							</SelectContent>
						</Select>

						<SearchInput
							placeholder="Filter…"
							value={logSearch}
							onChange={setLogSearch}
							containerClassName="sm:w-44"
							className="h-8 text-xs"
						/>
					</div>
				</div>

				<div className="max-h-80 space-y-0.5 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[11px] leading-relaxed">
					{isLoading && logs.length === 0 ? (
						<div className="py-4 text-center text-muted-foreground">
							Loading…
						</div>
					) : logs.length > 0 ? (
						logs.map((l) => {
							const lvl = (l.level || "INFO").toUpperCase();
							const lvlColor =
								lvl === "ERROR"
									? "text-rose-400"
									: lvl === "WARN"
										? "text-amber-400"
										: "text-cyan-400";

							return (
								<div
									key={`${l.timestamp}-${l.message}`}
									className="flex items-start gap-2 rounded p-1 hover:bg-white/[0.03]"
								>
									<span className={cn("shrink-0 font-bold", lvlColor)}>
										{lvl}
									</span>
									<span className="flex-1 whitespace-pre-wrap break-words text-foreground/80">
										{l.message}
									</span>
								</div>
							);
						})
					) : (
						<div className="py-4 text-center text-muted-foreground">
							No matching entries.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
