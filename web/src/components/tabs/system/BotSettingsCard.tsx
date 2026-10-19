import {
	Brain,
	Code2,
	Cpu,
	FileText,
	Globe,
	Link2,
	RotateCcw,
	Sliders,
} from "lucide-react";
import {
	type ElementType,
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import { LoadingState, RefreshButton } from "@/components/common";
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

const DEFAULT_SETTINGS: BotSettings = {
	llm_provider: "gemini",
	gemini_model: "gemini-3.8-flash",
	openai_model: "default",
	openai_base_url: "http://localhost:8080/v1",
	default_reply_probability: 0.05,
	enable_spontaneous_replies: true,
	chat_history_limit: 20,
	max_agent_steps: 50,
	log_level: "info",
	enable_web_search: true,
	enable_code_execution: true,
	enable_fetch_url: true,
	enable_agent_thinking: true,
};

const GroupLabel: FC<{ icon: ElementType; title: string }> = ({
	icon: Icon,
	title,
}) => (
	<div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
		<Icon className="h-3.5 w-3.5" />
		<span>{title}</span>
	</div>
);

interface ToggleRowProps {
	icon?: ElementType;
	title: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

const ToggleRow: FC<ToggleRowProps> = ({
	icon: Icon,
	title,
	description,
	checked,
	onCheckedChange,
}) => (
	<div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
		<div className="flex items-center gap-2.5 text-xs">
			{Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
			<div>
				<div className="font-medium text-foreground">{title}</div>
				<div className="text-muted-foreground">{description}</div>
			</div>
		</div>
		<Switch checked={checked} onCheckedChange={onCheckedChange} />
	</div>
);

function parseClampedInt(
	raw: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = Number.parseInt(raw, 10);
	if (Number.isNaN(parsed)) return fallback;
	return Math.min(max, Math.max(min, parsed));
}

interface ClampedNumberFieldProps {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (next: number) => void;
}

const ClampedNumberField: FC<ClampedNumberFieldProps> = ({
	id,
	label,
	value,
	min,
	max,
	onChange,
}) => {
	const [draft, setDraft] = useState(String(value));

	useEffect(() => {
		setDraft(String(value));
	}, [value]);

	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="text-xs text-muted-foreground">
				{label}
			</label>
			<Input
				id={id}
				type="number"
				min={min}
				max={max}
				value={draft}
				onChange={(e) => {
					const raw = e.target.value;
					setDraft(raw);
					const num = Number.parseInt(raw, 10);
					if (!Number.isNaN(num)) {
						onChange(Math.min(max, Math.max(min, num)));
					}
				}}
				onBlur={() => {
					const clamped = parseClampedInt(draft, value, min, max);
					setDraft(String(clamped));
					onChange(clamped);
				}}
			/>
		</div>
	);
};

interface EngineSettingsSectionProps {
	settings: BotSettings;
	onPatch: (patch: Partial<BotSettings>) => void;
}

const EngineSettingsSection: FC<EngineSettingsSectionProps> = ({
	settings,
	onPatch,
}) => {
	const isOpenAi = settings.llm_provider === "openai";
	const modelValue = isOpenAi
		? (settings.openai_model ?? "")
		: (settings.gemini_model ?? "");

	return (
		<div className="space-y-3">
			<GroupLabel icon={Cpu} title="AI engine" />

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label
						htmlFor="select-provider-sys"
						className="text-xs text-muted-foreground"
					>
						Provider
					</label>
					<Select
						value={settings.llm_provider ?? "gemini"}
						onValueChange={(val) =>
							onPatch({ llm_provider: val as "gemini" | "openai" })
						}
					>
						<SelectTrigger id="select-provider-sys" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="gemini">Google Gemini</SelectItem>
							<SelectItem value="openai">OpenAI / llama-server</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="input-model-sys"
						className="text-xs text-muted-foreground"
					>
						{isOpenAi ? "OpenAI / Local Model" : "Gemini Model"}
					</label>
					<Input
						id="input-model-sys"
						placeholder={isOpenAi ? "default" : "gemini-3.8-flash"}
						value={modelValue}
						onChange={(e) =>
							onPatch(
								isOpenAi
									? { openai_model: e.target.value }
									: { gemini_model: e.target.value },
							)
						}
					/>
				</div>

				{isOpenAi && (
					<div className="space-y-1.5 sm:col-span-2">
						<label
							htmlFor="input-openai-baseurl-sys"
							className="text-xs text-muted-foreground"
						>
							Server Base URL
						</label>
						<Input
							id="input-openai-baseurl-sys"
							placeholder="http://localhost:8080/v1"
							value={settings.openai_base_url ?? ""}
							onChange={(e) => onPatch({ openai_base_url: e.target.value })}
						/>
					</div>
				)}

				<ClampedNumberField
					id="input-agent-steps-sys"
					label="Max agent steps (1–100)"
					value={settings.max_agent_steps ?? 50}
					min={1}
					max={100}
					onChange={(val) => onPatch({ max_agent_steps: val })}
				/>

				<ClampedNumberField
					id="input-history-limit-sys"
					label="Context window (1–100 turns)"
					value={settings.chat_history_limit ?? 20}
					min={1}
					max={100}
					onChange={(val) => onPatch({ chat_history_limit: val })}
				/>
			</div>

			<div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
				<ToggleRow
					icon={Globe}
					title="Web search"
					description="Ground replies with live web results."
					checked={settings.enable_web_search ?? true}
					onCheckedChange={(val) => onPatch({ enable_web_search: val })}
				/>
				<ToggleRow
					icon={Code2}
					title="Code execution"
					description="Run code and workspace tools in sandbox."
					checked={settings.enable_code_execution ?? true}
					onCheckedChange={(val) => onPatch({ enable_code_execution: val })}
				/>
				<ToggleRow
					icon={Link2}
					title="URL reader"
					description="Fetch and read web pages directly."
					checked={settings.enable_fetch_url ?? true}
					onCheckedChange={(val) => onPatch({ enable_fetch_url: val })}
				/>
				<ToggleRow
					icon={Brain}
					title="Agent reasoning"
					description="Enable thinking budget on tool turns."
					checked={settings.enable_agent_thinking ?? true}
					onCheckedChange={(val) => onPatch({ enable_agent_thinking: val })}
				/>
			</div>
		</div>
	);
};

interface BehaviorAndLoggingSectionProps {
	settings: BotSettings;
	onPatch: (patch: Partial<BotSettings>) => void;
}

const BehaviorAndLoggingSection: FC<BehaviorAndLoggingSectionProps> = ({
	settings,
	onPatch,
}) => {
	const isSpontaneousOn = settings.enable_spontaneous_replies ?? true;
	const replyProbPct = Math.round(
		(settings.default_reply_probability ?? 0.05) * 100,
	);

	return (
		<>
			<div className="space-y-3 border-t border-border/60 pt-5">
				<GroupLabel icon={Sliders} title="Behavior" />

				<ToggleRow
					title="Spontaneous group replies"
					description="Allow the bot to chime in on group conversations on its own."
					checked={isSpontaneousOn}
					onCheckedChange={(val) =>
						onPatch({ enable_spontaneous_replies: val })
					}
				/>

				<div className="max-w-sm space-y-2 pt-1">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">Default reply rate</span>
						<span className="font-mono font-medium text-foreground tnum">
							{replyProbPct}%
						</span>
					</div>
					<Slider
						value={[replyProbPct]}
						min={0}
						max={100}
						step={1}
						disabled={!isSpontaneousOn}
						onValueChange={(val) =>
							onPatch({ default_reply_probability: val[0] / 100 })
						}
					/>
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
						onValueChange={(val) => onPatch({ log_level: val })}
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
		</>
	);
};

export const BotSettingsCard: FC = () => {
	const [savedSettings, setSavedSettings] =
		useState<BotSettings>(DEFAULT_SETTINGS);
	const [settings, setSettings] = useState<BotSettings>(DEFAULT_SETTINGS);
	const [isLoading, setIsLoading] = useState(true);

	const { isLoading: isSaving, execute: executeSave } = useAsyncAction();

	const applySnapshot = useCallback((data: BotSettings) => {
		const merged: BotSettings = { ...DEFAULT_SETTINGS, ...data };
		setSavedSettings(merged);
		setSettings(merged);
	}, []);

	const loadSettings = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await api.settings.get();
			applySnapshot(data);
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to load settings";
			toast.error(msg);
		} finally {
			setIsLoading(false);
		}
	}, [applySnapshot]);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	const handlePatch = useCallback((patch: Partial<BotSettings>) => {
		setSettings((prev) => ({ ...prev, ...patch }));
	}, []);

	const dirtyPatch = useMemo(() => {
		const patch: Partial<BotSettings> = {};
		const keys = Object.keys(DEFAULT_SETTINGS) as Array<keyof BotSettings>;
		for (const k of keys) {
			if (settings[k] !== savedSettings[k]) {
				// biome-ignore lint/suspicious/noExplicitAny: dynamic key assignment on Partial<BotSettings>
				(patch as any)[k] = settings[k];
			}
		}
		return patch;
	}, [settings, savedSettings]);

	const hasChanges = Object.keys(dirtyPatch).length > 0;

	const handleSaveSettings = async () => {
		if (!hasChanges) return;
		await executeSave(
			async () => {
				const res = await api.settings.update(dirtyPatch);
				applySnapshot(res.settings ?? settings);
			},
			{
				successMessage: "Settings saved!",
				errorMessage: "Save failed",
			},
		);
	};

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between gap-2">
				<div>
					<CardTitle>Engine & Runtime</CardTitle>
					<p className="mt-1 text-xs text-muted-foreground">
						Model, agent tools, and conversation behavior.
					</p>
				</div>
				<RefreshButton
					onClick={loadSettings}
					isLoading={isLoading}
					size="icon"
					label=""
				/>
			</CardHeader>

			<CardContent className="space-y-6">
				{isLoading && settings === DEFAULT_SETTINGS ? (
					<LoadingState text="Loading settings…" className="py-8" />
				) : (
					<>
						<EngineSettingsSection settings={settings} onPatch={handlePatch} />
						<BehaviorAndLoggingSection
							settings={settings}
							onPatch={handlePatch}
						/>

						<div className="flex items-center justify-end gap-2 border-t border-border/60 pt-5">
							{hasChanges && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setSettings(savedSettings)}
									disabled={isSaving}
									className="gap-1.5"
								>
									<RotateCcw className="h-3.5 w-3.5" />
									<span>Reset</span>
								</Button>
							)}
							<Button
								onClick={handleSaveSettings}
								disabled={!hasChanges || isSaving}
								size="sm"
							>
								{isSaving ? "Saving…" : "Save settings"}
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
};
