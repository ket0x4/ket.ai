import type { FC } from "react";
import { CopyButton, StatBox } from "@/components/common";
import type { SandboxVerboseData } from "@/types";

export interface SandboxPayloadTraceViewProps {
	verbose?: SandboxVerboseData;
}

export const SandboxPayloadTraceView: FC<SandboxPayloadTraceViewProps> = ({
	verbose,
}) => {
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
				<StatBox
					label="Memory Embedding Time"
					value={`${verbose.timings.embeddingMs}ms`}
					layout="vertical"
					className="bg-secondary/30 text-blue-400"
				/>
				<StatBox
					label="Gemini Inference Time"
					value={`${verbose.timings.inferenceMs}ms`}
					layout="vertical"
					className="bg-secondary/30 text-purple-400"
				/>
				<StatBox
					label="Total Roundtrip Time"
					value={`${verbose.timings.totalMs}ms`}
					layout="vertical"
					className="bg-secondary/30 text-emerald-400"
				/>
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
