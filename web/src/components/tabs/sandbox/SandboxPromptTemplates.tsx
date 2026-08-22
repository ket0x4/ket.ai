import { Bot, Brain, Sparkles, Zap } from "lucide-react";
import type { FC } from "react";
import { SANDBOX_PROMPT_TEMPLATES } from "@/lib/constants";

export interface SandboxPromptTemplatesProps {
	onSelectPrompt: (prompt: string) => void;
}

export const SandboxPromptTemplates: FC<SandboxPromptTemplatesProps> = ({
	onSelectPrompt,
}) => {
	return (
		<div className="space-y-2 p-3 rounded-xl bg-secondary/20 border border-border/40">
			<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Zap className="w-3.5 h-3.5 text-amber-400" />
					<span>Quick Test Templates</span>
				</div>
				<span className="text-[10px] text-muted-foreground">Click to load</span>
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
							onClick={() => onSelectPrompt(item.prompt)}
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
	);
};
