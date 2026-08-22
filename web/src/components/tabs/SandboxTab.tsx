import {
	Activity,
	Bot,
	Brain,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Code2,
	Database,
	Play,
	Search,
	Sliders,
	Sparkles,
	Timer,
	Zap,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/common";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Slider,
	Switch,
	Tabs,
	TabsList,
	TabsTrigger,
	Textarea,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { MEMORY_CATEGORIES, SANDBOX_PROMPT_TEMPLATES } from "@/lib/constants";
import { handleHorizontalWheelScroll } from "@/lib/utils";
import type {
	Chat,
	Persona,
	SandboxMemoryDiagnostic,
	SandboxMemoryDiagnostics,
	SandboxResponse,
	SandboxVerboseData,
} from "@/types";

interface SandboxTabProps {
	chats?: Chat[];
	personas?: Persona[];
	onRefresh?: () => void;
}

const MemoryDiagnosticCard: FC<{
	memory: SandboxMemoryDiagnostic;
	rank: number;
}> = ({ memory, rank }) => {
	const catMeta = MEMORY_CATEGORIES[memory.category] || {
		label: memory.category,
		textColor: "text-zinc-400",
		chipBg: "bg-secondary/40",
		chipBorder: "border-border/40",
	};

	return (
		<div
			className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
				memory.selected
					? "bg-blue-950/20 border-blue-500/40 shadow-sm"
					: memory.passedThreshold
						? "bg-emerald-950/10 border-emerald-500/30"
						: "bg-background/40 border-border/40 opacity-70"
			}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="font-mono font-bold text-[11px] text-muted-foreground">
						#{rank}
					</span>
					<Badge
						variant="outline"
						className={`text-[10px] font-mono px-2 py-0.5 ${catMeta.chipBg} ${catMeta.textColor} ${catMeta.chipBorder}`}
					>
						{catMeta.label}
					</Badge>
					{memory.selected ? (
						<Badge className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">
							Selected for Prompt (Top-K)
						</Badge>
					) : memory.passedThreshold ? (
						<Badge
							variant="outline"
							className="text-[10px] text-emerald-400 border-emerald-500/30"
						>
							Passed Threshold
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="text-[10px] text-zinc-500 border-zinc-700"
						>
							Below Threshold
						</Badge>
					)}
				</div>

				<div className="flex items-center gap-3 font-mono text-[11px]">
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground">CosSim:</span>
						<span className="text-zinc-200 font-semibold">
							{memory.cosSim.toFixed(4)}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground">Boost:</span>
						<span className="text-zinc-200">
							{memory.recencyBoost.toFixed(4)}
						</span>
					</div>
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground">Score:</span>
						<span
							className={`font-bold ${
								memory.selected
									? "text-blue-400"
									: memory.passedThreshold
										? "text-emerald-400"
										: "text-zinc-500"
							}`}
						>
							{memory.finalScore.toFixed(4)}
						</span>
					</div>
				</div>
			</div>

			<p className="text-zinc-200 font-mono text-[11px] leading-relaxed bg-background/40 p-2 rounded-lg border border-border/30">
				{memory.text}
			</p>

			<div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-300 ${
						memory.selected
							? "bg-blue-500"
							: memory.passedThreshold
								? "bg-emerald-500"
								: "bg-zinc-600"
					}`}
					style={{
						width: `${Math.max(0, Math.min(100, memory.finalScore * 100))}%`,
					}}
				/>
			</div>
		</div>
	);
};

const ExtractedMemoriesBanner: FC<{
	memories: Array<{
		user_name: string;
		fact: string;
		category?: string;
		ttl_days?: number;
	}>;
}> = ({ memories }) => (
	<Card className="border-emerald-500/30 bg-emerald-950/20 shadow-md animate-in fade-in duration-150">
		<CardContent className="p-4 space-y-2">
			<div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
				<CheckCircle2 className="w-4 h-4 shrink-0" />
				<span>
					AI Extracted {memories.length} New Memory Update(s) to Save:
				</span>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
				{memories.map((m) => (
					<div
						key={`${m.user_name}-${m.fact.slice(0, 20)}`}
						className="p-2.5 rounded-lg bg-emerald-900/30 border border-emerald-500/20 text-xs space-y-1"
					>
						<div className="flex items-center justify-between">
							<span className="font-semibold text-emerald-300">
								{m.user_name}
							</span>
							<Badge
								variant="outline"
								className="text-[10px] uppercase font-mono bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
							>
								{m.category || "PROFILE"}
							</Badge>
						</div>
						<p className="text-zinc-200 text-[11px] leading-relaxed">
							{m.fact}
						</p>
					</div>
				))}
			</div>
		</CardContent>
	</Card>
);

const MemoryDiagnosticsView: FC<{
	diagnostics?: SandboxMemoryDiagnostics;
}> = ({ diagnostics }) => {
	if (!diagnostics) {
		return (
			<div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl space-y-2">
				<Brain className="w-8 h-8 mx-auto opacity-30 text-primary" />
				<p>
					No memory diagnostics recorded yet. Run a test with RAG Memory enabled
					to view vector scores.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Embedding Latency
					</div>
					<div className="text-sm font-mono font-bold text-emerald-400">
						{diagnostics.embeddingTimeMs}ms
					</div>
				</div>
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Vector Dimensions
					</div>
					<div className="text-sm font-mono font-bold text-blue-400">
						{diagnostics.embeddingDimensions || 768}
					</div>
				</div>
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Matched / Total
					</div>
					<div className="text-sm font-mono font-bold text-purple-400">
						{diagnostics.matchedCount} / {diagnostics.totalMemoriesInChat}
					</div>
				</div>
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Cutoff Threshold
					</div>
					<div className="text-sm font-mono font-bold text-amber-400">
						{`≥ ${diagnostics.threshold.toFixed(2)}`}
					</div>
				</div>
			</div>

			<div className="p-3 rounded-xl bg-background/50 border border-border/40 space-y-1 text-xs">
				<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
					Enriched Query Sent for Embedding:
				</div>
				<div className="font-mono text-zinc-200 bg-secondary/40 px-2.5 py-1.5 rounded-lg break-all">
					{diagnostics.enrichedQuery}
				</div>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs">
					<span className="font-semibold text-foreground">
						Evaluated Memory Candidates (Ranked by Hybrid Score):
					</span>
					<span className="text-[11px] text-muted-foreground">
						Score = 85% Cosine Similarity + 15% Recency Decay Boost
					</span>
				</div>

				{diagnostics.details.length === 0 ? (
					<div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
						No memories stored in this chat context. You can add memories in the
						Memories tab.
					</div>
				) : (
					<div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
						{diagnostics.details.map((m, idx) => (
							<MemoryDiagnosticCard key={m.id} memory={m} rank={idx + 1} />
						))}
					</div>
				)}
			</div>
		</div>
	);
};

const PayloadTraceView: FC<{
	verbose?: SandboxVerboseData;
}> = ({ verbose }) => {
	if (!verbose) {
		return (
			<div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
				No execution trace recorded yet. Run a test to view full verbose
				payloads.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Memory Embedding Time
					</div>
					<div className="text-sm font-mono font-bold text-blue-400">
						{verbose.timings.embeddingMs}ms
					</div>
				</div>
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Gemini Inference Time
					</div>
					<div className="text-sm font-mono font-bold text-purple-400">
						{verbose.timings.inferenceMs}ms
					</div>
				</div>
				<div className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1">
					<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Total Roundtrip Time
					</div>
					<div className="text-sm font-mono font-bold text-emerald-400">
						{verbose.timings.totalMs}ms
					</div>
				</div>
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<span className="font-semibold text-foreground">
						Structured Agent Payload (Sent to Gemini):
					</span>
					<CopyButton
						text={JSON.stringify(verbose.inputPayload, null, 2)}
						successMessage="Payload copied!"
						className="h-6 text-[11px]"
					/>
				</div>
				<pre className="p-3.5 rounded-xl border border-zinc-800 bg-black/90 font-mono text-[11px] text-emerald-300 leading-relaxed max-h-[260px] overflow-auto whitespace-pre">
					{JSON.stringify(verbose.inputPayload, null, 2)}
				</pre>
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs">
					<span className="font-semibold text-foreground">
						Active System Instruction:
					</span>
					<CopyButton
						text={verbose.systemInstruction}
						successMessage="Instruction copied!"
						className="h-6 text-[11px]"
					/>
				</div>
				<pre className="p-3.5 rounded-xl border border-zinc-800 bg-black/90 font-mono text-[11px] text-zinc-300 leading-relaxed max-h-[200px] overflow-auto whitespace-pre-wrap">
					{verbose.systemInstruction}
				</pre>
			</div>

			{verbose.rawModelResponse && (
				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-xs">
						<span className="font-semibold text-foreground">
							Raw Model Candidate JSON Response:
						</span>
						<CopyButton
							text={verbose.rawModelResponse}
							successMessage="Raw response copied!"
							className="h-6 text-[11px]"
						/>
					</div>
					<pre className="p-3.5 rounded-xl border border-zinc-800 bg-black/90 font-mono text-[11px] text-purple-300 leading-relaxed max-h-[200px] overflow-auto whitespace-pre-wrap">
						{verbose.rawModelResponse}
					</pre>
				</div>
			)}
		</div>
	);
};

const ContextControlBar: FC<{
	chats: Chat[];
	personas: Persona[];
	selectedChatId: string;
	onSelectChatId: (id: string) => void;
	selectedPersonaId: string;
	onSelectPersonaId: (id: string) => void;
	enableMemory: boolean;
	onToggleMemory: (val: boolean) => void;
	verbose: boolean;
	onToggleVerbose: (val: boolean) => void;
	disabled: boolean;
}> = ({
	chats,
	personas,
	selectedChatId,
	onSelectChatId,
	selectedPersonaId,
	onSelectPersonaId,
	enableMemory,
	onToggleMemory,
	verbose,
	onToggleVerbose,
	disabled,
}) => (
	<div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
		<div className="space-y-1.5">
			<label
				htmlFor="sandbox-chat-select"
				className="text-xs font-semibold text-foreground flex items-center gap-1.5"
			>
				<Database className="w-3.5 h-3.5 text-primary" />
				<span>Target Chat Memory</span>
			</label>
			<Select
				value={selectedChatId}
				onValueChange={onSelectChatId}
				disabled={disabled}
			>
				<SelectTrigger
					id="sandbox-chat-select"
					className="h-9 text-xs bg-background/80"
				>
					<SelectValue placeholder="Select chat context..." />
				</SelectTrigger>
				<SelectContent>
					{chats.map((c) => (
						<SelectItem key={c.chat_id} value={c.chat_id}>
							<div className="flex items-center gap-2 text-xs">
								<span className="truncate max-w-[140px] font-medium">
									{c.title || `Chat (${c.chat_id})`}
								</span>
								<Badge
									variant="outline"
									className="text-[10px] font-mono px-1.5 py-0 h-4 bg-secondary/60"
								>
									{c.memoryCount ?? 0} mems
								</Badge>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>

		<div className="space-y-1.5">
			<label
				htmlFor="sandbox-persona-select"
				className="text-xs font-semibold text-foreground flex items-center gap-1.5"
			>
				<Bot className="w-3.5 h-3.5 text-blue-400" />
				<span>Agent Persona</span>
			</label>
			<Select
				value={selectedPersonaId}
				onValueChange={onSelectPersonaId}
				disabled={disabled}
			>
				<SelectTrigger
					id="sandbox-persona-select"
					className="h-9 text-xs bg-background/80"
				>
					<SelectValue placeholder="Default persona..." />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="default">
						<div className="flex items-center gap-1.5 text-xs">
							<Bot className="w-3.5 h-3.5 text-primary" />
							<span>Default Persona</span>
						</div>
					</SelectItem>
					{personas.map((p) => (
						<SelectItem key={p.id} value={p.id}>
							<div className="flex items-center gap-1.5 text-xs">
								<Bot className="w-3.5 h-3.5 text-blue-400" />
								<span className="font-medium" dir="auto">
									{p.name}
								</span>
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>

		<div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40 h-9">
			<label
				htmlFor="toggle-memory-rag"
				className="text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none"
			>
				<Brain
					className={`w-3.5 h-3.5 ${
						enableMemory ? "text-emerald-400" : "text-zinc-400"
					}`}
				/>
				<span>RAG Memory</span>
			</label>
			<Switch
				id="toggle-memory-rag"
				checked={enableMemory}
				onCheckedChange={onToggleMemory}
				disabled={disabled}
			/>
		</div>

		<div className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/40 h-9">
			<label
				htmlFor="toggle-verbose-output"
				className="text-xs font-medium flex items-center gap-1.5 cursor-pointer select-none"
			>
				<Activity
					className={`w-3.5 h-3.5 ${
						verbose ? "text-purple-400" : "text-zinc-400"
					}`}
				/>
				<span>Verbose Output</span>
			</label>
			<Switch
				id="toggle-verbose-output"
				checked={verbose}
				onCheckedChange={onToggleVerbose}
				disabled={disabled}
			/>
		</div>
	</div>
);

const AdvancedTuningSection: FC<{
	show: boolean;
	onToggle: () => void;
	topK: number;
	onSetTopK: (val: number) => void;
	threshold: number;
	onSetThreshold: (val: number) => void;
	activeTopic: string;
	onSetActiveTopic: (val: string) => void;
	customSystemInstruction: string;
	onSetCustomSystemInstruction: (val: string) => void;
}> = ({
	show,
	onToggle,
	topK,
	onSetTopK,
	threshold,
	onSetThreshold,
	activeTopic,
	onSetActiveTopic,
	customSystemInstruction,
	onSetCustomSystemInstruction,
}) => (
	<div className="border border-border/40 rounded-xl overflow-hidden bg-background/30">
		<button
			type="button"
			onClick={onToggle}
			className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
		>
			<div className="flex items-center gap-2">
				<Sliders className="w-3.5 h-3.5 text-primary" />
				<span>Advanced RAG & Persona Tuning</span>
			</div>
			<div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
				<span>
					Top-K: {topK} | Threshold: {threshold.toFixed(2)}
				</span>
				{show ? (
					<ChevronUp className="w-4 h-4" />
				) : (
					<ChevronDown className="w-4 h-4" />
				)}
			</div>
		</button>

		{show && (
			<div className="p-4 border-t border-border/40 bg-secondary/10 space-y-4 animate-in fade-in duration-150">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<label
								htmlFor="sandbox-topk-slider"
								className="font-medium text-foreground"
							>
								Top-K Memories to Inject
							</label>
							<span className="font-mono text-primary font-bold">{topK}</span>
						</div>
						<Slider
							id="sandbox-topk-slider"
							value={[topK]}
							onValueChange={(val) => onSetTopK(val[0] || 5)}
							min={1}
							max={20}
							step={1}
						/>
						<p className="text-[10px] text-muted-foreground">
							Maximum number of memories passing threshold to pass into Gemini
							context.
						</p>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between text-xs">
							<label
								htmlFor="sandbox-threshold-slider"
								className="font-medium text-foreground"
							>
								Similarity Threshold Score
							</label>
							<span className="font-mono text-emerald-400 font-bold">
								{threshold.toFixed(2)}
							</span>
						</div>
						<Slider
							id="sandbox-threshold-slider"
							value={[threshold]}
							onValueChange={(val) =>
								onSetThreshold(val[0] !== undefined ? val[0] : 0.6)
							}
							min={0.0}
							max={1.0}
							step={0.05}
						/>
						<p className="text-[10px] text-muted-foreground">
							Score calculation: 85% Cosine Similarity + 15% Recency Decay
							Boost.
						</p>
					</div>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="sandbox-topic-input"
						className="text-xs font-medium text-foreground"
					>
						Simulated Topic Context (Enriches RAG Query)
					</label>
					<Input
						id="sandbox-topic-input"
						placeholder="e.g. Planning weekend trip to Berlin (optional topic enrichment)..."
						value={activeTopic}
						onChange={(e) => onSetActiveTopic(e.target.value)}
						className="h-8 text-xs bg-background/60 font-sans"
					/>
				</div>

				<div className="space-y-1.5">
					<label
						htmlFor="sandbox-system-override"
						className="text-xs font-medium text-foreground"
					>
						System Instruction Override (Optional)
					</label>
					<Textarea
						id="sandbox-system-override"
						placeholder="Leave empty to use default system instruction with active persona..."
						value={customSystemInstruction}
						onChange={(e) => onSetCustomSystemInstruction(e.target.value)}
						rows={2}
						className="resize-none font-mono text-[11px] bg-background/60"
					/>
				</div>
			</div>
		)}
	</div>
);

const ModelResponseView: FC<{
	reply?: string;
	personaName?: string;
	isExecuting: boolean;
}> = ({ reply, personaName, isExecuting }) => (
	<div className="space-y-3">
		<div className="flex items-center justify-between text-xs text-muted-foreground">
			<div className="flex items-center gap-2">
				<span>Generated Reply:</span>
				{personaName && (
					<Badge variant="outline" className="text-[10px] bg-secondary/50">
						Persona: {personaName}
					</Badge>
				)}
			</div>
			{reply && (
				<CopyButton
					text={reply}
					successMessage="Response copied!"
					className="h-7 text-xs"
				/>
			)}
		</div>

		<div className="rounded-xl border border-zinc-800 bg-black/80 p-4 font-sans text-xs sm:text-sm leading-relaxed min-h-[160px] text-zinc-100 whitespace-pre-wrap selection:bg-primary/30">
			{isExecuting ? (
				<div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-400">
					<Sparkles className="w-6 h-6 animate-spin text-primary" />
					<span className="font-mono text-xs">
						Executing multi-step reasoning agent loop & vector search...
					</span>
				</div>
			) : reply ? (
				reply
			) : (
				<div className="text-zinc-500 py-12 text-center flex flex-col items-center justify-center gap-2">
					<Code2 className="w-8 h-8 opacity-30" />
					<span>
						Enter a prompt or select a quick template above, then click Execute
						Test.
					</span>
				</div>
			)}
		</div>
	</div>
);

export const SandboxTab: FC<SandboxTabProps> = ({
	chats: initialChats = [],
	personas: initialPersonas = [],
}) => {
	const [chats, setChats] = useState<Chat[]>(initialChats);
	const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
	const [isLoadingContext, setIsLoadingContext] = useState(false);

	const [selectedChatId, setSelectedChatId] = useState<string>("");
	const [selectedPersonaId, setSelectedPersonaId] = useState<string>("default");

	const [prompt, setPrompt] = useState("");
	const [enableMemory, setEnableMemory] = useState(true);
	const [verbose, setVerbose] = useState(true);
	const [activeTopic, setActiveTopic] = useState("");
	const [topK, setTopK] = useState(5);
	const [threshold, setThreshold] = useState(0.6);
	const [customSystemInstruction, setCustomSystemInstruction] = useState("");
	const [showAdvanced, setShowAdvanced] = useState(false);

	const [response, setResponse] = useState<SandboxResponse | null>(null);
	const [activeResultTab, setActiveResultTab] = useState<string>("reply");
	const { isLoading: isExecuting, execute } = useAsyncAction();

	useEffect(() => {
		if (initialChats.length > 0) setChats(initialChats);
	}, [initialChats]);

	useEffect(() => {
		if (initialPersonas.length > 0) setPersonas(initialPersonas);
	}, [initialPersonas]);

	useEffect(() => {
		if (chats.length === 0 || personas.length === 0) {
			setIsLoadingContext(true);
			Promise.all([
				api.chats.list().catch(() => []),
				api.personas.list().catch(() => ({ personas: [], activePersonas: {} })),
			])
				.then(([chatList, personaData]) => {
					if (chatList && chatList.length > 0) setChats(chatList);
					if (personaData?.personas) setPersonas(personaData.personas);
				})
				.finally(() => setIsLoadingContext(false));
		}
	}, [chats.length, personas.length]);

	useEffect(() => {
		if (!selectedChatId && chats.length > 0) {
			const chatWithMems = chats.find((c) => (c.memoryCount || 0) > 0);
			setSelectedChatId(
				chatWithMems ? chatWithMems.chat_id : chats[0]?.chat_id || "",
			);
		}
	}, [chats, selectedChatId]);

	const selectedChat = useMemo(
		() => chats.find((c) => c.chat_id === selectedChatId),
		[chats, selectedChatId],
	);

	const handleRunFull = async () => {
		const trimmed = prompt.trim();
		if (!trimmed) {
			toast.error("Please enter a test prompt or query.");
			return;
		}

		await execute(
			() =>
				api.sandbox.run({
					prompt: trimmed,
					chatId: selectedChatId || undefined,
					personaId:
						selectedPersonaId !== "default" ? selectedPersonaId : undefined,
					systemInstruction: customSystemInstruction.trim() || undefined,
					enableMemory,
					activeTopic: activeTopic.trim() || undefined,
					topK,
					threshold,
					verbose: true,
					mode: "full",
				}),
			{
				successMessage: "Agent reasoning & memory retrieval completed!",
				errorMessage: "Sandbox test failed",
				onSuccess: (res) => {
					setResponse(res);
					setActiveResultTab("reply");
				},
			},
		);
	};

	const handleRunRetrievalOnly = async () => {
		const trimmed = prompt.trim();
		if (!trimmed) {
			toast.error("Please enter a search query to test memory retrieval.");
			return;
		}
		if (!selectedChatId) {
			toast.error("Please select a chat context to query its memories.");
			return;
		}

		await execute(
			() =>
				api.sandbox.run({
					prompt: trimmed,
					chatId: selectedChatId,
					activeTopic: activeTopic.trim() || undefined,
					topK,
					threshold,
					verbose: true,
					mode: "retrieval_only",
				}),
			{
				successMessage: "Memory vector search completed!",
				errorMessage: "Memory retrieval failed",
				onSuccess: (res) => {
					setResponse(res);
					setActiveResultTab("memory");
				},
			},
		);
	};

	const memoryDiagnostics = response?.verbose?.memoryDiagnostics;
	const extractedNewMemories = response?.verbose?.extractedNewMemories;

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<Card className="glass-card border-border/70 shadow-lg">
				<CardHeader className="pb-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<CardTitle className="text-base sm:text-lg flex items-center gap-2.5">
							<div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
								<Sparkles className="w-5 h-5" />
							</div>
							<div>
								<span>AI Sandbox & Long-Term Memory Suite</span>
								<CardDescription className="text-xs text-muted-foreground mt-0.5">
									Test agent reasoning, long-term memory retrieval, persona
									tone, and inspect verbose RAG vectors.
								</CardDescription>
							</div>
						</CardTitle>
					</div>
				</CardHeader>

				<CardContent className="space-y-5">
					<ContextControlBar
						chats={chats}
						personas={personas}
						selectedChatId={selectedChatId}
						onSelectChatId={setSelectedChatId}
						selectedPersonaId={selectedPersonaId}
						onSelectPersonaId={setSelectedPersonaId}
						enableMemory={enableMemory}
						onToggleMemory={setEnableMemory}
						verbose={verbose}
						onToggleVerbose={setVerbose}
						disabled={isLoadingContext || isExecuting}
					/>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="sandbox-prompt-input"
								className="text-xs font-semibold text-foreground flex items-center gap-1.5"
							>
								<Sparkles className="w-3.5 h-3.5 text-primary" />
								<span>Input Prompt / Memory Recall Query</span>
							</label>
							{selectedChat && (
								<span className="text-[11px] text-muted-foreground">
									Testing with:{" "}
									<span className="text-foreground font-medium" dir="auto">
										{selectedChat.title || selectedChat.chat_id}
									</span>{" "}
									({selectedChat.memoryCount || 0} stored memories)
								</span>
							)}
						</div>
						<Textarea
							id="sandbox-prompt-input"
							placeholder="Ask the agent anything to test its memory recall, persona tone, or reasoning..."
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							rows={4}
							className="resize-none font-sans text-xs sm:text-sm bg-background/60 leading-relaxed border-border/60 focus-visible:ring-primary"
						/>
					</div>

					<div className="space-y-2 p-3 rounded-xl bg-secondary/20 border border-border/40">
						<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
							<div className="flex items-center gap-1.5">
								<Zap className="w-3.5 h-3.5 text-amber-400" />
								<span>Quick Test Templates</span>
							</div>
							<span className="text-[10px] text-muted-foreground">
								Click to load
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{SANDBOX_PROMPT_TEMPLATES.map((item) => {
								const isMemory = item.category === "Memory Recall";
								const isPersona = item.category === "Persona & Tone";
								const Icon = isMemory ? Brain : isPersona ? Bot : Sparkles;
								const colorClass = isMemory
									? "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
									: isPersona
										? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
										: "text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20";

								return (
									<button
										type="button"
										key={item.label}
										onClick={() => setPrompt(item.prompt)}
										className={`p-2.5 rounded-lg text-xs transition-all border text-left flex items-start gap-2 group ${colorClass}`}
									>
										<Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
										<div className="min-w-0 flex-1">
											<div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
												{item.label}
											</div>
											<div className="text-[10px] text-muted-foreground truncate mt-0.5">
												{item.prompt}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					<AdvancedTuningSection
						show={showAdvanced}
						onToggle={() => setShowAdvanced(!showAdvanced)}
						topK={topK}
						onSetTopK={setTopK}
						threshold={threshold}
						onSetThreshold={setThreshold}
						activeTopic={activeTopic}
						onSetActiveTopic={setActiveTopic}
						customSystemInstruction={customSystemInstruction}
						onSetCustomSystemInstruction={setCustomSystemInstruction}
					/>

					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border/40">
						<div className="flex flex-wrap items-center gap-2 text-xs">
							{response && (
								<>
									<Badge
										variant="outline"
										className="flex items-center gap-1 font-mono text-[11px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
									>
										<Timer className="w-3 h-3 text-emerald-400" />
										<span>{response.executionTimeMs}ms total</span>
									</Badge>
									{memoryDiagnostics && (
										<Badge
											variant="outline"
											className="flex items-center gap-1 font-mono text-[11px] bg-blue-500/10 text-blue-300 border-blue-500/20"
										>
											<Brain className="w-3 h-3 text-blue-400" />
											<span>
												{memoryDiagnostics.retrievedMemories.length} /{" "}
												{memoryDiagnostics.totalMemoriesInChat} mems
											</span>
										</Badge>
									)}
									<Badge
										variant="outline"
										className="font-mono text-[11px] bg-secondary/50 text-muted-foreground"
									>
										{response.model}
									</Badge>
								</>
							)}
						</div>

						<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
							<Button
								variant="outline"
								size="sm"
								onClick={handleRunRetrievalOnly}
								disabled={isExecuting || !selectedChatId}
								className="text-xs h-9 gap-1.5 border-border/70 hover:bg-secondary/80"
								title="Perform vector embedding search without running LLM generation"
							>
								<Search className="w-3.5 h-3.5 text-blue-400" />
								<span>Test Retrieval Only</span>
							</Button>

							<Button
								size="sm"
								onClick={handleRunFull}
								disabled={isExecuting}
								className="text-xs h-9 gap-1.5 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4"
							>
								<Play
									className={`w-3.5 h-3.5 ${
										isExecuting ? "animate-spin" : "fill-current"
									}`}
								/>
								<span>{isExecuting ? "Reasoning..." : "Execute Test"}</span>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{extractedNewMemories && extractedNewMemories.length > 0 && (
				<ExtractedMemoriesBanner memories={extractedNewMemories} />
			)}

			<Card className="glass-card border-border/70 shadow-lg">
				<CardHeader className="pb-3 border-b border-border/40">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<CardTitle className="text-sm font-semibold flex items-center gap-2">
								<Bot className="w-4 h-4 text-primary" />
								<span>Execution Output & Diagnostics</span>
							</CardTitle>
							<CardDescription className="text-xs text-muted-foreground">
								Inspect the agent's final output, memory similarity scores, and
								exact prompt traces.
							</CardDescription>
						</div>

						<Tabs
							value={activeResultTab}
							onValueChange={setActiveResultTab}
							className="w-full sm:w-auto min-w-0"
						>
							<div
								className="overflow-x-auto pb-1 sm:pb-0 no-scrollbar touch-pan-x"
								onWheel={handleHorizontalWheelScroll}
							>
								<TabsList className="h-8 bg-secondary/60 p-0.5 rounded-lg inline-flex w-max gap-0.5">
									<TabsTrigger
										value="reply"
										className="text-xs h-7 px-3 gap-1.5 shrink-0 whitespace-nowrap data-[state=active]:bg-background"
									>
										<Bot className="w-3.5 h-3.5" />
										<span>Model Response</span>
									</TabsTrigger>
									<TabsTrigger
										value="memory"
										className="text-xs h-7 px-3 gap-1.5 shrink-0 whitespace-nowrap data-[state=active]:bg-background"
									>
										<Brain className="w-3.5 h-3.5 text-blue-400" />
										<span>Memory Diagnostics</span>
										{memoryDiagnostics && (
											<Badge
												variant="secondary"
												className="text-[10px] px-1 h-3.5 bg-blue-500/20 text-blue-300 ml-0.5"
											>
												{memoryDiagnostics.retrievedMemories.length}
											</Badge>
										)}
									</TabsTrigger>
									{verbose && (
										<TabsTrigger
											value="payload"
											className="text-xs h-7 px-3 gap-1.5 shrink-0 whitespace-nowrap data-[state=active]:bg-background"
										>
											<Code2 className="w-3.5 h-3.5 text-purple-400" />
											<span>Prompt & Payload</span>
										</TabsTrigger>
									)}
								</TabsList>
							</div>
						</Tabs>
					</div>
				</CardHeader>

				<CardContent className="pt-4">
					{activeResultTab === "reply" && (
						<ModelResponseView
							reply={response?.reply}
							personaName={response?.verbose?.personaName}
							isExecuting={isExecuting}
						/>
					)}

					{activeResultTab === "memory" && (
						<MemoryDiagnosticsView diagnostics={memoryDiagnostics} />
					)}

					{activeResultTab === "payload" && verbose && (
						<PayloadTraceView verbose={response?.verbose} />
					)}
				</CardContent>
			</Card>
		</div>
	);
};
