import {
	Bot,
	Brain,
	Code2,
	Play,
	Search,
	Sparkles,
	Terminal,
	Timer,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Tabs,
	TabsList,
	TabsTrigger,
	Textarea,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { handleHorizontalWheelScroll } from "@/lib/utils";
import type {
	Chat,
	Persona,
	SandboxMemoryDiagnostics,
	SandboxResponse,
} from "@/types";
import {
	ExtractedMemoriesBanner,
	SandboxAdvancedTuning,
	SandboxContextBar,
	SandboxDiagnosticsView,
	SandboxPayloadTraceView,
	SandboxPromptTemplates,
	SandboxResponseView,
	SandboxTerminalLiveView,
	type TerminalArtifact,
	type TerminalLogEntry,
} from "./sandbox";

function detectCodeLanguage(code: string): string {
	const trimmed = code.trim();
	if (
		trimmed.startsWith("#!/bin/bash") ||
		trimmed.startsWith("curl ") ||
		trimmed.startsWith("echo ") ||
		trimmed.startsWith("ls ")
	) {
		return "bash";
	}
	if (
		trimmed.includes("interface ") ||
		trimmed.includes(": string") ||
		trimmed.includes(": number")
	) {
		return "typescript";
	}
	if (
		trimmed.includes("console.log") ||
		trimmed.includes("const ") ||
		trimmed.includes("let ")
	) {
		return "javascript";
	}
	return "python";
}

interface DispatchEventState {
	setTerminalStatus: (s: string) => void;
	setTerminalLogs: (
		fn: (prev: TerminalLogEntry[]) => TerminalLogEntry[],
	) => void;
	setTerminalExitCode: (code: number) => void;
	setTerminalDurationMs: (ms: number) => void;
	setTerminalArtifacts: (arts: TerminalArtifact[]) => void;
	startTime: number;
}

function handleTerminalSseChunk(
	event: { type: string; text: string; data?: unknown },
	state: DispatchEventState,
) {
	if (event.type === "status") {
		state.setTerminalStatus(event.text);
		state.setTerminalLogs((prev) => [
			...prev,
			{
				id: `status_${Date.now()}_${Math.random()}`,
				type: "status",
				text: event.text,
				timestamp: Date.now(),
			},
		]);
	} else if (event.type === "stdout" || event.type === "stderr") {
		state.setTerminalLogs((prev) => [
			...prev,
			{
				id: `${event.type}_${Date.now()}_${Math.random()}`,
				type: event.type as "stdout" | "stderr",
				text: event.text,
				timestamp: Date.now(),
			},
		]);
	} else if (event.type === "result" && event.data) {
		// biome-ignore lint/suspicious/noExplicitAny: artifacts payload
		const res = event.data as any;
		state.setTerminalExitCode(res.exitCode ?? 0);
		state.setTerminalDurationMs(
			res.executionTimeMs || Date.now() - state.startTime,
		);
		if (res.artifacts || res.images) {
			state.setTerminalArtifacts(res.artifacts || res.images || []);
		}
	}
}

interface ExecutionControlsProps {
	response: SandboxResponse | null;
	memoryDiagnostics?: SandboxMemoryDiagnostics;
	isExecuting: boolean;
	isStreamingCode: boolean;
	hasSelectedChat: boolean;
	onExecuteDirectCode: () => void;
	onRunRetrievalOnly: () => void;
	onRunFull: () => void;
}

const SandboxExecutionControls: FC<ExecutionControlsProps> = ({
	response,
	memoryDiagnostics,
	isExecuting,
	isStreamingCode,
	hasSelectedChat,
	onExecuteDirectCode,
	onRunRetrievalOnly,
	onRunFull,
}) => (
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

		<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
			<Button
				variant="outline"
				size="sm"
				onClick={onExecuteDirectCode}
				disabled={isStreamingCode || isExecuting}
				className="text-xs h-9 gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300"
				title="Execute code directly in sandbox container with live SSE streaming output"
			>
				<Terminal
					className={`w-3.5 h-3.5 ${
						isStreamingCode
							? "animate-spin text-emerald-400"
							: "text-emerald-400"
					}`}
				/>
				<span>{isStreamingCode ? "Streaming..." : "Run Script (SSE)"}</span>
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={onRunRetrievalOnly}
				disabled={isExecuting || isStreamingCode || !hasSelectedChat}
				className="text-xs h-9 gap-1.5 border-border/70 hover:bg-secondary/80"
				title="Perform vector embedding search without running LLM generation"
			>
				<Search className="w-3.5 h-3.5 text-blue-400" />
				<span>Test Retrieval Only</span>
			</Button>

			<Button
				size="sm"
				onClick={onRunFull}
				disabled={isExecuting || isStreamingCode}
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
);

interface OutputSectionProps {
	response: SandboxResponse | null;
	memoryDiagnostics?: SandboxMemoryDiagnostics;
	verbose: boolean;
	activeResultTab: string;
	onSelectTab: (tab: string) => void;
	terminalLogs: TerminalLogEntry[];
	isStreamingCode: boolean;
	terminalStatus: string;
	terminalExitCode: number | null;
	terminalDurationMs?: number;
	terminalArtifacts: TerminalArtifact[];
	isExecuting: boolean;
	onClearTerminal: () => void;
}

const SandboxOutputSection: FC<OutputSectionProps> = ({
	response,
	memoryDiagnostics,
	verbose,
	activeResultTab,
	onSelectTab,
	terminalLogs,
	isStreamingCode,
	terminalStatus,
	terminalExitCode,
	terminalDurationMs,
	terminalArtifacts,
	isExecuting,
	onClearTerminal,
}) => (
	<Card className="glass-card border-border/70 shadow-lg">
		<CardHeader className="pb-3 border-b border-border/40">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div>
					<CardTitle className="text-sm font-semibold flex items-center gap-2">
						<Bot className="w-4 h-4 text-primary" />
						<span>Execution Output & Diagnostics</span>
					</CardTitle>
					<CardDescription className="text-xs text-muted-foreground">
						Inspect the agent's final output, live sandbox console, memory
						similarity scores, and exact prompt traces.
					</CardDescription>
				</div>

				<Tabs
					value={activeResultTab}
					onValueChange={onSelectTab}
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
								value="terminal"
								className="text-xs h-7 px-3 gap-1.5 shrink-0 whitespace-nowrap data-[state=active]:bg-background"
							>
								<Terminal className="w-3.5 h-3.5 text-emerald-400" />
								<span>Live Console</span>
								{terminalLogs.length > 0 && (
									<Badge
										variant="secondary"
										className="text-[10px] px-1 h-3.5 bg-emerald-500/20 text-emerald-300 ml-0.5"
									>
										{terminalLogs.length}
									</Badge>
								)}
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
				<SandboxResponseView
					reply={response?.reply}
					personaName={response?.verbose?.personaName}
					images={response?.images}
					isExecuting={isExecuting}
				/>
			)}

			{activeResultTab === "terminal" && (
				<SandboxTerminalLiveView
					logs={terminalLogs}
					isExecuting={isStreamingCode}
					statusMessage={terminalStatus}
					exitCode={terminalExitCode}
					executionTimeMs={terminalDurationMs}
					artifacts={terminalArtifacts}
					onClear={onClearTerminal}
				/>
			)}

			{activeResultTab === "memory" && (
				<SandboxDiagnosticsView diagnostics={memoryDiagnostics} />
			)}

			{activeResultTab === "payload" && verbose && (
				<SandboxPayloadTraceView verbose={response?.verbose} />
			)}
		</CardContent>
	</Card>
);

interface SandboxTabProps {
	chats?: Chat[];
	personas?: Persona[];
	onRefresh?: () => void;
}

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

	const [terminalLogs, setTerminalLogs] = useState<TerminalLogEntry[]>([]);
	const [terminalStatus, setTerminalStatus] = useState<string>("");
	const [terminalExitCode, setTerminalExitCode] = useState<number | null>(null);
	const [terminalDurationMs, setTerminalDurationMs] = useState<
		number | undefined
	>(undefined);
	const [terminalArtifacts, setTerminalArtifacts] = useState<
		TerminalArtifact[]
	>([]);
	const [isStreamingCode, setIsStreamingCode] = useState(false);

	const handleExecuteDirectCode = async () => {
		const trimmed = prompt.trim();
		if (!trimmed) {
			toast.error("Please enter a code snippet or script to execute.");
			return;
		}

		setIsStreamingCode(true);
		setTerminalLogs([]);
		setTerminalStatus("Connecting to sandbox daemon...");
		setTerminalExitCode(null);
		setTerminalDurationMs(undefined);
		setTerminalArtifacts([]);
		setActiveResultTab("terminal");

		const startTime = Date.now();
		const language = detectCodeLanguage(trimmed);

		const dispatchState: DispatchEventState = {
			setTerminalStatus,
			setTerminalLogs,
			setTerminalExitCode,
			setTerminalDurationMs,
			setTerminalArtifacts,
			startTime,
		};

		try {
			await api.sandbox.executeStream(
				{
					language,
					code: trimmed,
					sessionId: selectedChatId || "default",
				},
				(event) => handleTerminalSseChunk(event, dispatchState),
			);
			toast.success("Sandbox script execution completed!");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setTerminalLogs((prev) => [
				...prev,
				{
					id: `err_${Date.now()}`,
					type: "stderr",
					text: `Error: ${msg}`,
					timestamp: Date.now(),
				},
			]);
			setTerminalExitCode(1);
			toast.error(`Execution error: ${msg}`);
		} finally {
			setIsStreamingCode(false);
		}
	};

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
					<SandboxContextBar
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

					<SandboxPromptTemplates onSelectPrompt={setPrompt} />

					<SandboxAdvancedTuning
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

					<SandboxExecutionControls
						response={response}
						memoryDiagnostics={memoryDiagnostics}
						isExecuting={isExecuting}
						isStreamingCode={isStreamingCode}
						hasSelectedChat={Boolean(selectedChatId)}
						onExecuteDirectCode={handleExecuteDirectCode}
						onRunRetrievalOnly={handleRunRetrievalOnly}
						onRunFull={handleRunFull}
					/>
				</CardContent>
			</Card>

			{extractedNewMemories && extractedNewMemories.length > 0 && (
				<ExtractedMemoriesBanner memories={extractedNewMemories} />
			)}

			<SandboxOutputSection
				response={response}
				memoryDiagnostics={memoryDiagnostics}
				verbose={verbose}
				activeResultTab={activeResultTab}
				onSelectTab={setActiveResultTab}
				terminalLogs={terminalLogs}
				isStreamingCode={isStreamingCode}
				terminalStatus={terminalStatus}
				terminalExitCode={terminalExitCode}
				terminalDurationMs={terminalDurationMs}
				terminalArtifacts={terminalArtifacts}
				isExecuting={isExecuting}
				onClearTerminal={() => setTerminalLogs([])}
			/>
		</div>
	);
};
