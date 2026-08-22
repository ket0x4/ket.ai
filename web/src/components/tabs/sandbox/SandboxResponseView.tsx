import { Code2, Sparkles } from "lucide-react";
import type { FC } from "react";
import { CopyButton } from "@/components/common";
import { Badge } from "@/components/ui/badge";

export interface SandboxResponseViewProps {
	reply?: string;
	personaName?: string;
	isExecuting: boolean;
}

export const SandboxResponseView: FC<SandboxResponseViewProps> = ({
	reply,
	personaName,
	isExecuting,
}) => {
	return (
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
							Enter a prompt or select a quick template above, then click
							Execute Test.
						</span>
					</div>
				)}
			</div>
		</div>
	);
};
