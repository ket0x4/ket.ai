import { Bot, Check, Code2, Copy, Play, Sparkles, Timer } from "lucide-react";
import { type FC, useState } from "react";
import { toast } from "sonner";
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
import { apiFetch } from "@/lib/api";
import type { SandboxResponse } from "@/types";

export const SandboxTab: FC = () => {
	const [prompt, setPrompt] = useState("");
	const [isExecuting, setIsExecuting] = useState(false);
	const [response, setResponse] = useState<SandboxResponse | null>(null);
	const [copied, setCopied] = useState(false);

	const samplePrompts = [
		"What is your identity and what group are we in?",
		"Summarize what you know about the bot owner.",
		"Search the web for the latest TypeScript release features.",
		"Explain the difference between PROFILE and TEMPORARY memories.",
	];

	const handleRunSandbox = async () => {
		if (!prompt.trim()) {
			toast.error("Please enter a test prompt.");
			return;
		}

		try {
			setIsExecuting(true);
			const res = await apiFetch<SandboxResponse>("/api/sandbox", {
				method: "POST",
				body: JSON.stringify({ prompt: prompt.trim() }),
			});
			setResponse(res);
			toast.success("Reasoning loop completed!");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Execution failed";
			toast.error(msg);
		} finally {
			setIsExecuting(false);
		}
	};

	const handleCopyResponse = () => {
		if (response?.reply && navigator.clipboard) {
			navigator.clipboard.writeText(response.reply);
			setCopied(true);
			toast.success("Response copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		}
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
							{samplePrompts.map((p) => (
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
						<Button
							variant="ghost"
							size="sm"
							onClick={handleCopyResponse}
							className="h-8 text-xs flex items-center gap-1.5"
						>
							{copied ? (
								<>
									<Check className="w-3.5 h-3.5 text-emerald-400" />
									<span className="text-emerald-400">Copied</span>
								</>
							) : (
								<>
									<Copy className="w-3.5 h-3.5" />
									<span>Copy</span>
								</>
							)}
						</Button>
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
