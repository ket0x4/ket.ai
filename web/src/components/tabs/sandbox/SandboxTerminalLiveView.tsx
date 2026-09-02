import {
	CheckCircle2,
	Copy,
	Download,
	ImageIcon,
	Sparkles,
	Terminal,
	XCircle,
} from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TerminalLogEntry {
	id: string;
	type: "status" | "stdout" | "stderr" | "system";
	text: string;
	timestamp: number;
}

export interface TerminalArtifact {
	filename: string;
	mimeType: string;
	data: string; // base64
	type: string;
	sizeBytes?: number;
}

export interface SandboxTerminalLiveViewProps {
	logs: TerminalLogEntry[];
	isExecuting: boolean;
	statusMessage?: string;
	exitCode?: number | null;
	executionTimeMs?: number;
	artifacts?: TerminalArtifact[];
	onClear?: () => void;
}

const LogItem: FC<{ log: TerminalLogEntry }> = ({ log }) => {
	let colorClass = "text-zinc-300";
	let prefix = "";

	if (log.type === "status") {
		colorClass = "text-sky-400 font-semibold";
		prefix = "⚡ ";
	} else if (log.type === "stderr") {
		colorClass = "text-rose-400";
		prefix = "✕ ";
	} else if (log.type === "system") {
		colorClass = "text-amber-400/90";
		prefix = "✦ ";
	}

	return (
		<div className={`whitespace-pre-wrap break-all ${colorClass}`}>
			{prefix}
			{log.text}
		</div>
	);
};

const ArtifactCard: FC<{
	art: TerminalArtifact;
	onDownload: (art: TerminalArtifact) => void;
}> = ({ art, onDownload }) => {
	const isImage = art.type === "image" || art.mimeType.startsWith("image/");

	return (
		<div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 space-y-2.5">
			<div className="flex items-center justify-between text-xs">
				<span className="font-mono font-medium text-zinc-200 truncate">
					{art.filename}
				</span>
				<div className="flex items-center gap-2">
					{art.sizeBytes && (
						<Badge
							variant="outline"
							className="text-[10px] bg-secondary/30 text-zinc-400"
						>
							{Math.round(art.sizeBytes / 1024)} KB
						</Badge>
					)}
					<Button
						size="sm"
						variant="outline"
						onClick={() => onDownload(art)}
						className="h-6 px-2 text-[10px] gap-1 border-border/70"
					>
						<Download className="w-3 h-3" />
						<span>Download</span>
					</Button>
				</div>
			</div>

			{isImage ? (
				<div className="rounded-lg overflow-hidden bg-black/60 border border-zinc-800 flex items-center justify-center p-1">
					<img
						src={`data:${art.mimeType};base64,${art.data}`}
						alt={art.filename}
						className="max-h-64 w-full object-contain"
					/>
				</div>
			) : (
				<div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-3 flex items-center gap-3 text-xs text-zinc-400">
					<Terminal className="w-5 h-5 text-emerald-400 shrink-0" />
					<div className="truncate">
						<div className="font-mono text-zinc-200 truncate">
							{art.filename}
						</div>
						<div className="text-[10px] text-zinc-500">{art.mimeType}</div>
					</div>
				</div>
			)}
		</div>
	);
};

const TerminalStatusBadge: FC<{
	isExecuting: boolean;
	statusMessage?: string;
	exitCode?: number | null;
	executionTimeMs?: number;
}> = ({ isExecuting, statusMessage, exitCode, executionTimeMs }) => {
	if (isExecuting) {
		return (
			<Badge
				variant="outline"
				className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse flex items-center gap-1"
			>
				<Sparkles className="w-3 h-3 animate-spin" />
				<span>{statusMessage || "Running..."}</span>
			</Badge>
		);
	}
	if (exitCode !== undefined && exitCode !== null) {
		return (
			<Badge
				variant="outline"
				className={`text-[10px] flex items-center gap-1 ${
					exitCode === 0
						? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
						: "bg-red-500/10 text-red-400 border-red-500/30"
				}`}
			>
				{exitCode === 0 ? (
					<CheckCircle2 className="w-3 h-3" />
				) : (
					<XCircle className="w-3 h-3" />
				)}
				<span>
					Exit {exitCode} {executionTimeMs ? `(${executionTimeMs}ms)` : ""}
				</span>
			</Badge>
		);
	}
	return (
		<Badge
			variant="outline"
			className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700"
		>
			Idle
		</Badge>
	);
};

const TerminalHeader: FC<{
	isExecuting: boolean;
	statusMessage?: string;
	exitCode?: number | null;
	executionTimeMs?: number;
	logsLength: number;
	onCopy: () => void;
	onClear?: () => void;
}> = ({
	isExecuting,
	statusMessage,
	exitCode,
	executionTimeMs,
	logsLength,
	onCopy,
	onClear,
}) => (
	<div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800">
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-1.5 mr-2">
				<div className="w-3 h-3 rounded-full bg-red-500/80" />
				<div className="w-3 h-3 rounded-full bg-yellow-500/80" />
				<div className="w-3 h-3 rounded-full bg-emerald-500/80" />
			</div>
			<Terminal className="w-4 h-4 text-emerald-400" />
			<span className="text-xs font-mono font-medium text-zinc-300">
				Sandbox Live Console
			</span>
			<TerminalStatusBadge
				isExecuting={isExecuting}
				statusMessage={statusMessage}
				exitCode={exitCode}
				executionTimeMs={executionTimeMs}
			/>
		</div>

		<div className="flex items-center gap-2">
			{logsLength > 0 && (
				<>
					<Button
						variant="ghost"
						size="sm"
						onClick={onCopy}
						className="h-7 text-xs px-2 text-zinc-400 hover:text-zinc-200"
						title="Copy output"
					>
						<Copy className="w-3.5 h-3.5 mr-1" />
						<span>Copy</span>
					</Button>
					{onClear && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onClear}
							className="h-7 text-xs px-2 text-zinc-400 hover:text-zinc-200"
						>
							Clear
						</Button>
					)}
				</>
			)}
		</div>
	</div>
);

export const SandboxTerminalLiveView: FC<SandboxTerminalLiveViewProps> = ({
	logs,
	isExecuting,
	statusMessage,
	exitCode,
	executionTimeMs,
	artifacts,
	onClear,
}) => {
	const terminalRef = useRef<HTMLDivElement>(null);
	const [autoScroll, setAutoScroll] = useState(true);

	useEffect(() => {
		if (autoScroll && terminalRef.current) {
			terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
		}
	}, [autoScroll]);

	const handleCopy = () => {
		const fullText = logs.map((l) => l.text).join("\n");
		navigator.clipboard.writeText(fullText);
		toast.success("Terminal output copied to clipboard!");
	};

	const handleDownload = (art: TerminalArtifact) => {
		try {
			const link = document.createElement("a");
			link.href = `data:${art.mimeType};base64,${art.data}`;
			link.download = art.filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			toast.success(`Downloaded ${art.filename}`);
		} catch {
			toast.error(`Failed to download ${art.filename}`);
		}
	};

	return (
		<div className="space-y-4">
			{/* Terminal Header Bar */}
			<div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
				<TerminalHeader
					isExecuting={isExecuting}
					statusMessage={statusMessage}
					exitCode={exitCode}
					executionTimeMs={executionTimeMs}
					logsLength={logs.length}
					onCopy={handleCopy}
					onClear={onClear}
				/>

				{/* Terminal Output Body */}
				<div
					ref={terminalRef}
					onScroll={(e) => {
						const el = e.currentTarget;
						const isNearBottom =
							el.scrollHeight - el.scrollTop - el.clientHeight < 40;
						setAutoScroll(isNearBottom);
					}}
					className="p-4 font-mono text-xs leading-relaxed max-h-[360px] min-h-[180px] overflow-y-auto space-y-1 text-zinc-200 bg-black selection:bg-emerald-500/30"
				>
					{logs.length === 0 ? (
						<div className="text-zinc-600 py-10 text-center flex flex-col items-center justify-center gap-2">
							<Terminal className="w-8 h-8 opacity-20" />
							<span>
								Terminal output stream will appear live here as code executes.
							</span>
						</div>
					) : (
						logs.map((log) => <LogItem key={log.id} log={log} />)
					)}

					{isExecuting && (
						<div className="flex items-center gap-1.5 text-emerald-400 animate-pulse pt-1">
							<span className="inline-block w-2 h-4 bg-emerald-400" />
							<span className="text-[11px] text-zinc-400">
								Streaming execution...
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Generated Visual Artifacts Display */}
			{artifacts && artifacts.length > 0 && (
				<div className="space-y-3 pt-2">
					<div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
						<div className="flex items-center gap-2">
							<ImageIcon className="w-4 h-4 text-emerald-400" />
							<span>Generated Deliverables ({artifacts.length})</span>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{artifacts.map((art) => (
							<ArtifactCard
								key={`${art.filename}-${art.mimeType}`}
								art={art}
								onDownload={handleDownload}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
