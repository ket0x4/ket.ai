import { Brain } from "lucide-react";
import type { FC } from "react";
import { CategoryBadge, StatBox } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import type {
	SandboxMemoryDiagnostic,
	SandboxMemoryDiagnostics,
} from "@/types";

export const MemoryDiagnosticCard: FC<{
	memory: SandboxMemoryDiagnostic;
	rank: number;
}> = ({ memory, rank }) => {
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
					<CategoryBadge category={memory.category} variant="chip" />
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

export const SandboxDiagnosticsView: FC<{
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
				<StatBox
					label="Embedding Latency"
					value={`${diagnostics.embeddingTimeMs}ms`}
					layout="vertical"
					className="bg-secondary/30 text-emerald-400"
				/>
				<StatBox
					label="Vector Dimensions"
					value={diagnostics.embeddingDimensions || 768}
					layout="vertical"
					className="bg-secondary/30 text-blue-400"
				/>
				<StatBox
					label="Matched / Total"
					value={`${diagnostics.matchedCount} / ${diagnostics.totalMemoriesInChat}`}
					layout="vertical"
					className="bg-secondary/30 text-purple-400"
				/>
				<StatBox
					label="Cutoff Threshold"
					value={`≥ ${diagnostics.threshold.toFixed(2)}`}
					layout="vertical"
					className="bg-secondary/30 text-amber-400"
				/>
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
