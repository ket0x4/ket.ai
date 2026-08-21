import { Bot, Code2, Play, Sparkles, Timer } from "lucide-react";
import { type FC, useState } from "react";
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
	Textarea,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { SANDBOX_SAMPLE_PROMPTS } from "@/lib/constants";
import type { SandboxResponse } from "@/types";

export const SandboxTab: FC = () => {
	const [prompt, setPrompt] = useState("");
	const [response, setResponse] = useState<SandboxResponse | null>(null);
	const { isLoading: isExecuting, execute } = useAsyncAction();

	const handleRunSandbox = async () => {
		const trimmed = prompt.trim();
		if (!trimmed) {
			toast.error("Please enter a test prompt.");
			return;
		}

		await execute(() => api.sandbox.run({ prompt: trimmed }), {
			successMessage: "Reasoning loop completed!",
			errorMessage: "Execution failed",
			onSuccess: (res) => setResponse(res),
		});
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<Card className="glass-card">
				<CardHeader className="pb-4">
					<CardTitle className="text-base sm:text-lg flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-primary" />
						<span>AI Reasoning Sandbox</span>
					</CardTitle>
					<CardDescription>
						Directly test Gemini agent system instructions, memory retrieval,
						and tool grounding.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="space-y-2">
						<label
							htmlFor="sandbox-prompt-input"
							className="text-xs font-semibold text-foreground"
						>
							Input Prompt / Query
						</label>
						<Textarea
							id="sandbox-prompt-input"
							placeholder="Enter a prompt or question to test Gemini..."
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							rows={4}
							className="resize-none font-sans text-xs sm:text-sm bg-background/50"
						/>
					</div>

					<div className="space-y-1.5">
						<div className="text-[11px] font-medium text-muted-foreground">
							Quick test templates:
						</div>
						<div className="flex flex-wrap gap-1.5">
							{SANDBOX_SAMPLE_PROMPTS.map((p) => (
								<button
									type="button"
									key={p}
									onClick={() => setPrompt(p)}
									className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-secondary-foreground text-xs transition-colors border border-border/40 text-left truncate max-w-xs"
								>
									{p}
								</button>
							))}
						</div>
					</div>

					<div className="flex items-center justify-between pt-2 border-t border-border/40">
						<div className="flex items-center gap-2">
							{response && (
								<div className="flex items-center gap-2 text-xs">
									<Badge
										variant="outline"
										className="flex items-center gap-1 font-mono text-[11px]"
									>
										<Timer className="w-3 h-3 text-emerald-400" />
										<span>{response.executionTimeMs}ms</span>
									</Badge>
									<Badge variant="outline" className="font-mono text-[11px]">
										{response.model}
									</Badge>
								</div>
							)}
						</div>

						<Button
							onClick={handleRunSandbox}
							disabled={isExecuting}
							className="flex items-center gap-2 text-xs shadow-md shadow-primary/20"
						>
							<Play
								className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`}
							/>
							<span>{isExecuting ? "Reasoning..." : "Execute Test"}</span>
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="glass-card">
				<CardHeader className="pb-3 flex flex-row items-center justify-between">
					<div>
						<CardTitle className="text-sm font-semibold flex items-center gap-2">
							<Bot className="w-4 h-4 text-blue-400" />
							<span>Model Output</span>
						</CardTitle>
						<CardDescription className="text-xs">
							Complete response returned by Gemini engine.
						</CardDescription>
					</div>
					{response?.reply && (
						<CopyButton
							text={response.reply}
							successMessage="Response copied to clipboard!"
							className="h-8"
						/>
					)}
				</CardHeader>

				<CardContent>
					<div className="rounded-xl border border-zinc-800 bg-black/90 p-4 font-mono text-xs leading-relaxed min-h-[160px] text-zinc-200 overflow-x-auto whitespace-pre-wrap">
						{isExecuting ? (
							<div className="flex items-center gap-2 text-zinc-500 py-8 justify-center">
								<Sparkles className="w-4 h-4 animate-spin text-primary" />
								<span>Executing multi-step reasoning agent loop...</span>
							</div>
						) : response?.reply ? (
							response.reply
						) : (
							<div className="text-zinc-500 py-8 text-center flex flex-col items-center gap-2">
								<Code2 className="w-6 h-6 opacity-40" />
								<span>Enter a prompt above and click Execute to test.</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
