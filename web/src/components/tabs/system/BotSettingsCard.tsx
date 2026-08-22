import {
	Cpu,
	FileText,
	Globe,
	Settings,
	Sliders,
	Sparkles,
	Trash2,
} from "lucide-react";
import {
	type ElementType,
	type FC,
	useCallback,
	useEffect,
	useState,
} from "react";
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
import type { BotSettings } from "@/types";

const SettingGroupHeader: FC<{ icon: ElementType; title: string }> = ({
	icon: Icon,
	title,
}) => (
	<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
		<Icon className="w-3.5 h-3.5 text-primary" />
		<span>{title}</span>
	</div>
);

export const BotSettingsCard: FC = () => {
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
			<CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="min-w-0 flex-1">
					<CardTitle className="text-base sm:text-lg flex items-center gap-2">
						<Settings className="w-5 h-5 text-primary" />
						<span>Bot Engine Settings</span>
					</CardTitle>
					<CardDescription className="text-xs text-muted-foreground mt-0.5">
						Configure AI parameters, grounding, reasoning steps, and system
						behavior.
					</CardDescription>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleClearCache}
					disabled={isClearingCache}
					className="text-xs h-8 text-amber-400 hover:text-amber-300 shrink-0 self-start sm:self-center"
				>
					<Trash2 className="w-3.5 h-3.5 mr-1" />
					<span>{isClearingCache ? "Clearing..." : "Purge Cache"}</span>
				</Button>
			</CardHeader>

			<CardContent className="space-y-5">
				<div className="space-y-3">
					<SettingGroupHeader icon={Cpu} title="AI Engine & Grounding" />

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
					<SettingGroupHeader
						icon={Sliders}
						title="Behavior & Context Parameters"
					/>

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
					<SettingGroupHeader icon={FileText} title="Diagnostic Logging" />

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
