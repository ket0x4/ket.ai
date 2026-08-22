import { ChevronDown, ChevronUp, Sliders } from "lucide-react";
import type { FC } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

export interface SandboxAdvancedTuningProps {
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
}

export const SandboxAdvancedTuning: FC<SandboxAdvancedTuningProps> = ({
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
}) => {
	return (
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
};
