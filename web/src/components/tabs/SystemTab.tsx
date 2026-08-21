import {
	Cpu,
	FileText,
	Globe,
	RefreshCw,
	Search,
	Settings,
	Sliders,
	Sparkles,
	Terminal,
	Trash2,
	Wrench,
} from "lucide-react";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import type { BotSettings, LogEntry, ToolTrace } from "@/types";

const LOG_LEVELS = ["ALL", "INFO", "WARN", "ERROR"] as const;

// Subcomponent 1: Bot Settings Card
const BotSettingsCard: FC = () => {
	const [settings, setSettings] = useState<BotSettings>({
		gemini_model: "gemini-3.5-flash-lite",
		default_reply_probability: 0.05,
		chat_history_limit: 10,
		max_agent_steps: 3,
		log_level: "info",
		enable_web_search: true,
	});

	const { isLoading: isSaving, execute: executeSave } = useAsyncAction();
	const { isLoading: isClearingCache, execute: executeClearCache } =
		useAsyncAction();

	const loadSettings = useCallback(async () => {
		try {
			const data = await api.settings.get();
			setSettings(data);
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to load settings";
			toast.error(msg);
		}
	}, []);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	const handleSaveSettings = async () => {
		await executeSave(() => api.settings.update(settings), {
			successMessage: "Global bot settings saved!",
			errorMessage: "Save failed",
		});
	};

	const handleClearCache = async () => {
		if (!window.confirm("Clear memory vector embedding cache?")) return;
		await executeClearCache(() => api.settings.clearCache(), {
			successMessage: "Embedding cache purged successfully.",
			errorMessage: "Cache clear failed",
		});
	};

	const replyProbPct = Math.round(
		(settings.default_reply_probability ?? 0.05) * 100,
	);

	return (
		<Card className="glass-card">
			<CardHeader className="pb-4 flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base sm:text-lg flex items-center gap-2">
						<Settings className="w-5 h-5 text-primary" />
						<span>Bot Engine Settings</span>
					</CardTitle>
					<CardDescription>
						Configure AI parameters, grounding, reasoning steps, and system
						behavior.
					</CardDescription>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleClearCache}
					disabled={isClearingCache}
					className="text-xs h-8 text-amber-400 hover:text-amber-300"
				>
					<Trash2 className="w-3.5 h-3.5 mr-1" />
					<span>{isClearingCache ? "Clearing..." : "Purge Cache"}</span>
				</Button>
			</CardHeader>

			<CardContent className="space-y-5">
				<div className="space-y-3">
					<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
						<Cpu className="w-3.5 h-3.5 text-primary" />
						<span>AI Engine & Grounding</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<label
								htmlFor="select-gemini-model-sys"
								className="text-xs font-medium text-foreground"
							>
								Active Gemini Model
							</label>
							<Select
								value={settings.gemini_model || "gemini-3.5-flash-lite"}
								onValueChange={(val) =>
									setSettings({ ...settings, gemini_model: val })
								}
							>
								<SelectTrigger
									id="select-gemini-model-sys"
									className="w-full bg-background/50"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="gemini-3.5-flash-lite">
										gemini-3.5-flash-lite (Fast & Standard)
									</SelectItem>
									<SelectItem value="gemini-3.5-flash">
										gemini-3.5-flash (Balanced)
									</SelectItem>
									<SelectItem value="gemini-3.5-pro">
										gemini-3.5-pro (Advanced Reasoning)
									</SelectItem>
									<SelectItem value="gemini-3.1-flash-lite">
										gemini-3.1-flash-lite (Alternative)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="input-agent-steps-sys"
								className="text-xs font-medium text-foreground"
							>
								Max Agent Reasoning Steps
							</label>
							<Input
								id="input-agent-steps-sys"
								type="number"
								min={1}
								max={10}
								value={settings.max_agent_steps ?? 3}
								onChange={(e) =>
									setSettings({
										...settings,
										max_agent_steps: parseInt(e.target.value, 10) || 3,
									})
								}
								className="bg-background/50"
							/>
						</div>
					</div>

					<div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50">
						<div className="space-y-0.5">
							<div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
								<Globe className="w-3.5 h-3.5 text-blue-400" />
								<span>Google Web Search Grounding</span>
							</div>
							<div className="text-[11px] text-muted-foreground">
								Enables dynamic search subagents to ground responses with
								real-time web facts.
							</div>
						</div>
						<Switch
							checked={settings.enable_web_search ?? true}
							onCheckedChange={(val) =>
								setSettings({ ...settings, enable_web_search: val })
							}
						/>
					</div>
				</div>

				<div className="space-y-3 pt-2 border-t border-border/40">
					<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
						<Sliders className="w-3.5 h-3.5 text-primary" />
						<span>Behavior & Context Parameters</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium text-foreground">
									Default Random Reply Rate
								</span>
								<span className="font-mono font-bold text-primary">
									{replyProbPct}%
								</span>
							</div>
							<Slider
								value={[replyProbPct]}
								min={0}
								max={100}
								step={1}
								onValueChange={(val) =>
									setSettings({
										...settings,
										default_reply_probability: val[0] / 100,
									})
								}
							/>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="input-history-limit-sys"
								className="text-xs font-medium text-foreground"
							>
								Chat Context Window Turns
							</label>
							<Input
								id="input-history-limit-sys"
								type="number"
								min={5}
								max={100}
								value={settings.chat_history_limit ?? 10}
								onChange={(e) =>
									setSettings({
										...settings,
										chat_history_limit: parseInt(e.target.value, 10) || 10,
									})
								}
								className="bg-background/50"
							/>
						</div>
					</div>
				</div>

				<div className="space-y-3 pt-2 border-t border-border/40">
					<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
						<FileText className="w-3.5 h-3.5 text-primary" />
						<span>Diagnostic Logging</span>
					</div>

					<div className="space-y-1.5 max-w-xs">
						<label
							htmlFor="select-log-level-sys"
							className="text-xs font-medium text-foreground"
						>
							Minimum Log Level
						</label>
						<Select
							value={settings.log_level || "info"}
							onValueChange={(val) =>
								setSettings({ ...settings, log_level: val })
							}
						>
							<SelectTrigger
								id="select-log-level-sys"
								className="w-full bg-background/50"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="debug">debug (Detailed trace)</SelectItem>
								<SelectItem value="info">info (Standard runtime)</SelectItem>
								<SelectItem value="warn">warn (Warnings & Errors)</SelectItem>
								<SelectItem value="error">error (Critical only)</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="pt-2 flex justify-end">
					<Button
						onClick={handleSaveSettings}
						disabled={isSaving}
						className="flex items-center gap-2 text-xs"
					>
						<Sparkles className="w-4 h-4" />
						<span>{isSaving ? "Saving..." : "Save Settings"}</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

// Subcomponent 2: Live Logs Card
const LiveLogsCard: FC = () => {
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
						<span>Live Console Stream</span>
					</CardTitle>
					<CardDescription>
						Real-time structured logs from application and error handlers.
					</CardDescription>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={loadLogs}
					disabled={isLoading}
					className="h-8 text-xs flex items-center gap-1.5"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
					/>
					<span>Refresh</span>
				</Button>
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

						<div className="relative flex-1 sm:w-48">
							<Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Filter log text..."
								value={logSearch}
								onChange={(e) => setLogSearch(e.target.value)}
								className="pl-8 h-8 text-xs bg-background/50"
							/>
						</div>
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
									<span className="text-zinc-500 shrink-0 select-none text-[10px]">
										{l.timestamp}
									</span>
									<span
										className={`px-1 rounded border text-[9px] sm:text-[10px] font-bold shrink-0 ${lvlColor}`}
									>
										{lvl}
									</span>
									<span className="text-zinc-200 break-words whitespace-pre-wrap">{l.message}</span>
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

// Subcomponent 3: Tool Traces Card
const ToolTracesCard: FC = () => {
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
				<Button
					variant="outline"
					size="sm"
					onClick={loadTraces}
					disabled={isLoading}
					className="h-8 text-xs flex items-center gap-1.5"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
					/>
					<span>Refresh</span>
				</Button>
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

export const SystemTab: FC = () => {
	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<BotSettingsCard />
			<LiveLogsCard />
			<ToolTracesCard />
		</div>
	);
};
