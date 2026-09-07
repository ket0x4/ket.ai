import { Code2, ImageIcon, Sparkles } from "lucide-react";
import type { FC } from "react";
import { CopyButton } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import type { SandboxGeneratedImage } from "@/types";

export interface SandboxResponseViewProps {
	reply?: string;
	personaName?: string;
	images?: SandboxGeneratedImage[];
	isExecuting: boolean;
}

export const SandboxResponseView: FC<SandboxResponseViewProps> = ({
	reply,
	personaName,
	images,
	isExecuting,
}) => {
	return (
		<div className="space-y-4">
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

			{images && images.length > 0 && (
				<div className="space-y-2.5 pt-2">
					<div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
						<ImageIcon className="w-4 h-4 text-primary" />
						<span>Generated Visual Output(s) ({images.length})</span>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{images.map((img) => (
							<div
								key={`${img.filename}-${img.data.slice(0, 16)}`}
								className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 space-y-2"
							>
								<div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
									<span className="font-mono font-medium text-zinc-300 truncate">
										{img.filename}
									</span>
									{img.sizeBytes && (
										<Badge
											variant="outline"
											className="text-[10px] bg-secondary/30 text-zinc-400"
										>
											{Math.round(img.sizeBytes / 1024)} KB
										</Badge>
									)}
								</div>
								<div className="rounded-lg overflow-hidden bg-black/50 border border-zinc-800 flex items-center justify-center">
									<img
										src={`data:${img.mimeType};base64,${img.data}`}
										alt={img.filename}
										className="max-h-72 w-full object-contain"
									/>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
