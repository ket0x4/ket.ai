import { Terminal } from "lucide-react";
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

const LEVEL_COLOR_MAP: Record<string, string> = {
	ERROR: "text-rose-400",
	WARN: "text-amber-400",
	DEBUG: "text-purple-400",
	INFO: "text-cyan-400",
};

const LogRow: FC<{ entry: LogEntry }> = ({ entry }) => {
	const lvl = (entry.level || "INFO").toUpperCase();
	const lvlColor = LEVEL_COLOR_MAP[lvl] || "text-cyan-400";
	const shortTime = entry.timestamp ? entry.timestamp.slice(11, 19) : "";

	return (
		<div className="flex items-start gap-2 rounded p-1 hover:bg-white/[0.03]">
			{shortTime && (
				<span className="shrink-0 text-muted-foreground/60 tnum">
					{shortTime}
				</span>
			)}
			<span className={cn("w-11 shrink-0 font-bold", lvlColor)}>{lvl}</span>
			<span className="flex-1 whitespace-pre-wrap break-words text-foreground/80">
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
					<div className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-border p-0.5 no-scrollbar">
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
							showClearButton
							containerClassName="flex-1 sm:w-48 sm:flex-none"
							className="h-8 text-xs"
						/>
					</div>
				</div>

				<div className="max-h-80 space-y-0.5 overflow-y-auto overflow-x-auto rounded-lg border border-border bg-black/40 p-3 font-mono text-[11px] leading-relaxed">
					{isLoading && logs.length === 0 ? (
						<div className="py-4 text-center text-muted-foreground">
							Loading…
						</div>
					) : filteredLogs.length > 0 ? (
						filteredLogs.map((l, idx) => (
							<LogRow key={l.id ?? `${l.timestamp}-${idx}`} entry={l} />
						))
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
