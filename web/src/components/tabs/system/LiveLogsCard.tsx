import { type FC, useCallback, useEffect, useMemo, useState } from "react";
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

const LOG_LEVELS = ["ALL", "DEBUG", "INFO", "WARN", "ERROR"] as const;

const LEVEL_CLASS: Record<string, string> = {
	DEBUG: "text-muted-foreground",
	INFO: "text-foreground",
	WARN: "text-amber-400",
	ERROR: "text-rose-400",
};

const LogRow: FC<{ entry: LogEntry }> = ({ entry }) => {
	const level = (entry.level || "INFO").toUpperCase();
	const time = entry.timestamp ? entry.timestamp.slice(11, 19) : "";

	return (
		<div className="grid grid-cols-[4.5rem_3.5rem_1fr] items-start gap-2 border-b border-border/40 px-3 py-1.5 last:border-b-0 hover:bg-white/[0.03]">
			<span
				className="truncate font-mono text-[11px] text-muted-foreground/70 tnum"
				title={entry.timestamp || undefined}
			>
				{time}
			</span>
			<span
				className={cn(
					"font-mono text-[10px] font-semibold uppercase tracking-wide",
					LEVEL_CLASS[level] ?? "text-foreground",
				)}
			>
				{level}
			</span>
			<span className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/90">
				{entry.message}
			</span>
		</div>
	);
};

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
				limit: 250,
			});
			setLogs(data.logs || []);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to fetch logs";
			toast.error(msg);
		} finally {
			setIsLoading(false);
		}
	}, [logType, logLevelFilter]);

	useEffect(() => {
		loadLogs();
	}, [loadLogs]);

	const filteredLogs = useMemo(() => {
		const query = logSearch.trim().toLowerCase();
		if (!query) return logs;
		return logs.filter(
			(l) =>
				l.message.toLowerCase().includes(query) ||
				l.timestamp?.toLowerCase().includes(query) ||
				l.level?.toLowerCase().includes(query),
		);
	}, [logs, logSearch]);

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between py-3">
				<div className="flex items-baseline gap-2">
					<CardTitle>Logs</CardTitle>
					<span className="font-mono text-[10px] text-muted-foreground tnum">
						{filteredLogs.length}
					</span>
				</div>
				<RefreshButton onClick={loadLogs} isLoading={isLoading} />
			</CardHeader>

			<CardContent className="space-y-2.5">
				<div className="flex flex-col items-stretch justify-between gap-2 text-xs sm:flex-row sm:items-center">
					<div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-border p-0.5 no-scrollbar">
						{LOG_LEVELS.map((level) => (
							<button
								type="button"
								key={level}
								onClick={() => setLogLevelFilter(level)}
								className={cn(
									"rounded-md px-2 py-0.5 text-[10px] font-medium",
									logLevelFilter === level
										? "bg-white/10 text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{level}
							</button>
						))}
					</div>

					<div className="flex items-center gap-1.5">
						<Select
							value={logType}
							onValueChange={(val) => setLogType(val as "app" | "error")}
						>
							<SelectTrigger className="h-8 w-28 text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="app">app.log</SelectItem>
								<SelectItem value="error">error.log</SelectItem>
							</SelectContent>
						</Select>

						<SearchInput
							placeholder="Filter"
							value={logSearch}
							onChange={setLogSearch}
							showClearButton
							containerClassName="flex-1 sm:w-40 sm:flex-none"
							className="h-8 text-xs"
						/>
					</div>
				</div>

				<div className="overflow-hidden rounded-lg border border-border bg-background">
					<div className="grid grid-cols-[4.5rem_3.5rem_1fr] gap-2 border-b border-border bg-secondary/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						<span>Time</span>
						<span>Level</span>
						<span>Message</span>
					</div>
					<div className="max-h-[50dvh] min-h-[200px] overflow-y-auto">
						{isLoading && logs.length === 0 ? (
							<div className="py-8 text-center text-xs text-muted-foreground">
								Loading
							</div>
						) : filteredLogs.length > 0 ? (
							filteredLogs.map((entry, index) => (
								<LogRow
									key={entry.id ?? `${entry.timestamp}-${index}`}
									entry={entry}
								/>
							))
						) : (
							<div className="py-8 text-center text-xs text-muted-foreground">
								No logs.
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
