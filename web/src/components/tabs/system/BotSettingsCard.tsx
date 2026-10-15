import { Cpu, FileText, Globe, Sliders } from "lucide-react";
import {
	type ElementType,
	type FC,
	useCallback,
	useEffect,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const GroupLabel: FC<{ icon: ElementType; title: string }> = ({
	icon: Icon,
	title,
}) => (
	<div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
		<Icon className="h-3.5 w-3.5" />
		<span>{title}</span>
	</div>
);

export const BotSettingsCard: FC = () => {
	const [settings, setSettings] = useState<BotSettings>({
		gemini_model: "gemini-3.8-flash",
		default_reply_probability: 0.05,
		chat_history_limit: 10,
		max_agent_steps: 3,
		log_level: "info",
		enable_web_search: true,
	});

	const { isLoading: isSaving, execute: executeSave } = useAsyncAction();

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
			successMessage: "Settings saved!",
			errorMessage: "Save failed",
		});
	};

	const replyProbPct = Math.round(
		(settings.default_reply_probability ?? 0.05) * 100,
	);

	return (
		<Card>
			<CardHeader className="flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle>Engine</CardTitle>
				<span className="text-xs text-muted-foreground">
					Model, reasoning, and runtime behavior.
				</span>
			</CardHeader>

			<CardContent className="space-y-6">
				<div className="space-y-3">
					<GroupLabel icon={Cpu} title="AI engine" />

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<label
								htmlFor="select-gemini-model-sys"
								className="text-xs text-muted-foreground"
							>
								Model
							</label>
							<Select
								value={settings.gemini_model || "gemini-3.8-flash"}
								onValueChange={(val) =>
									setSettings({ ...settings, gemini_model: val })
								}
							>
								<SelectTrigger id="select-gemini-model-sys" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="gemini-3.8-flash">
										gemini-3.8-flash · flagship
									</SelectItem>
									<SelectItem value="gemini-3.7-flash">
										gemini-3.7-flash · balanced
									</SelectItem>
									<SelectItem value="gemini-3.5-flash-lite">
										gemini-3.5-flash-lite · fast
									</SelectItem>
									<SelectItem value="gemini-3.1-pro-preview">
										gemini-3.1-pro-preview · reasoning
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="input-agent-steps-sys"
								className="text-xs text-muted-foreground"
							>
								Max reasoning steps
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
							/>
						</div>
					</div>

					<div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
						<div className="flex items-center gap-2.5 text-xs">
							<Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
							<div>
								<div className="font-medium text-foreground">Web search</div>
								<div className="text-muted-foreground">
									Ground replies with live web results.
								</div>
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

				<div className="space-y-3 border-t border-border/60 pt-5">
					<GroupLabel icon={Sliders} title="Behavior" />

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Default reply rate
								</span>
								<span className="font-mono font-medium text-foreground tnum">
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
								className="text-xs text-muted-foreground"
							>
								Context window (turns)
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
							/>
						</div>
					</div>
				</div>

				<div className="space-y-3 border-t border-border/60 pt-5">
					<GroupLabel icon={FileText} title="Logging" />

					<div className="max-w-xs space-y-1.5">
						<label
							htmlFor="select-log-level-sys"
							className="text-xs text-muted-foreground"
						>
							Minimum log level
						</label>
						<Select
							value={settings.log_level || "info"}
							onValueChange={(val) =>
								setSettings({ ...settings, log_level: val })
							}
						>
							<SelectTrigger id="select-log-level-sys" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="debug">debug</SelectItem>
								<SelectItem value="info">info</SelectItem>
								<SelectItem value="warn">warn</SelectItem>
								<SelectItem value="error">error</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex justify-end border-t border-border/60 pt-5">
					<Button onClick={handleSaveSettings} disabled={isSaving}>
						{isSaving ? "Saving…" : "Save settings"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
