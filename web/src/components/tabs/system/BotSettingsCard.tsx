import { RotateCcw } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
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

const SectionLabel: FC<{ title: string }> = ({ title }) => (
	<h3 className="text-[11px] font-medium text-muted-foreground">{title}</h3>
);

interface ToggleRowProps {
	id: string;
	title: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

const ToggleRow: FC<ToggleRowProps> = ({
	id,
	title,
	checked,
	onCheckedChange,
}) => (
	<div className="flex items-center justify-between gap-3 py-2">
		<label htmlFor={id} className="text-xs text-foreground">
			{title}
		</label>
		<Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
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
	return (
		<div className="space-y-3">
			<SectionLabel title="Engine" />

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label
						htmlFor="input-model-sys"
						className="text-xs text-muted-foreground"
					>
						Model
					</label>
					<Input
						id="input-model-sys"
						placeholder="default"
						value={settings.openai_model ?? ""}
						onChange={(e) => onPatch({ openai_model: e.target.value })}
					/>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="input-openai-baseurl-sys"
						className="text-xs text-muted-foreground"
					>
						Base URL
					</label>
					<Input
						id="input-openai-baseurl-sys"
						placeholder="http://localhost:8080/v1"
						value={settings.openai_base_url ?? ""}
						onChange={(e) => onPatch({ openai_base_url: e.target.value })}
					/>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="input-embedding-model-sys"
						className="text-xs text-muted-foreground"
					>
						Embedding model
					</label>
					<Input
						id="input-embedding-model-sys"
						placeholder="text-embedding-3-small"
						value={settings.openai_embedding_model ?? ""}
						onChange={(e) =>
							onPatch({ openai_embedding_model: e.target.value })
						}
					/>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="input-embedding-baseurl-sys"
						className="text-xs text-muted-foreground"
					>
						Embedding base URL
					</label>
					<Input
						id="input-embedding-baseurl-sys"
						placeholder="Same as main URL"
						value={settings.openai_embedding_base_url ?? ""}
						onChange={(e) =>
							onPatch({ openai_embedding_base_url: e.target.value })
						}
					/>
				</div>

				<ClampedNumberField
					id="input-agent-steps-sys"
					label="Max steps"
					value={settings.max_agent_steps ?? 50}
					min={1}
					max={100}
					onChange={(val) => onPatch({ max_agent_steps: val })}
				/>

				<ClampedNumberField
					id="input-history-limit-sys"
					label="History turns"
					value={settings.chat_history_limit ?? 20}
					min={1}
					max={100}
					onChange={(val) => onPatch({ chat_history_limit: val })}
				/>
			</div>

			<div className="divide-y divide-border/60">
				<ToggleRow
					id="toggle-code-execution"
					title="Code execution"
					checked={settings.enable_code_execution ?? true}
					onCheckedChange={(val) => onPatch({ enable_code_execution: val })}
				/>
				<ToggleRow
					id="toggle-fetch-url"
					title="URL reader"
					checked={settings.enable_fetch_url ?? true}
					onCheckedChange={(val) => onPatch({ enable_fetch_url: val })}
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
			<div className="space-y-3 border-t border-border/60 pt-4">
				<SectionLabel title="Behavior" />

				<ToggleRow
					id="toggle-spontaneous"
					title="Spontaneous replies"
					checked={isSpontaneousOn}
					onCheckedChange={(val) =>
						onPatch({ enable_spontaneous_replies: val })
					}
				/>

				<div className="space-y-2">
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
						aria-label="Default reply rate"
					/>
				</div>
			</div>

			<div className="space-y-2 border-t border-border/60 pt-4">
				<SectionLabel title="Logging" />

				<div className="max-w-xs space-y-1.5">
					<label
						htmlFor="select-log-level-sys"
						className="text-xs text-muted-foreground"
					>
						Level
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
	const [savedSettings, setSavedSettings] = useState<BotSettings | null>(null);
	const [settings, setSettings] = useState<BotSettings | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const { isLoading: isSaving, execute: executeSave } = useAsyncAction();

	const applySnapshot = useCallback((data: BotSettings) => {
		setSavedSettings(data);
		setSettings(data);
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
		setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
	}, []);

	const dirtyPatch = useMemo(() => {
		const patch: Partial<BotSettings> = {};
		if (!settings || !savedSettings) return patch;

		const keys = Object.keys(settings) as Array<keyof BotSettings>;
		for (const key of keys) {
			if (settings[key] !== savedSettings[key]) {
				// biome-ignore lint/suspicious/noExplicitAny: dynamic key assignment on Partial<BotSettings>
				(patch as any)[key] = settings[key];
			}
		}
		return patch;
	}, [settings, savedSettings]);

	const hasChanges = Object.keys(dirtyPatch).length > 0;

	const handleSaveSettings = async () => {
		const current = settings;
		if (!hasChanges || !current) return;
		await executeSave(
			async () => {
				const res = await api.settings.update(dirtyPatch);
				applySnapshot(res.settings ?? current);
			},
			{
				successMessage: "Saved.",
				errorMessage: "Save failed",
			},
		);
	};

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between gap-2 py-3">
				<CardTitle>Configuration</CardTitle>
				<RefreshButton onClick={loadSettings} isLoading={isLoading} />
			</CardHeader>

			<CardContent className="space-y-5">
				{!settings ? (
					<LoadingState className="py-6" />
				) : (
					<>
						<EngineSettingsSection settings={settings} onPatch={handlePatch} />
						<BehaviorAndLoggingSection
							settings={settings}
							onPatch={handlePatch}
						/>

						<div className="flex items-center justify-end gap-1.5 border-t border-border/60 pt-4">
							{hasChanges && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setSettings(savedSettings)}
									disabled={isSaving}
									className="gap-1"
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
								{isSaving ? "Saving" : "Save"}
							</Button>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
};
