import { ArrowRight, RefreshCw, ShieldAlert, Terminal } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AccessDeniedProps {
	title?: string;
	message?: string;
	onRetry: () => void;
}

export const AccessDenied: FC<AccessDeniedProps> = ({
	title = "Telegram Access Required",
	message = "This console is cryptographically protected and is designed to run securely inside Telegram Mini Apps.",
	onRetry,
}) => {
	const [customInitData, setCustomInitData] = useState("");
	const [showDevInput, setShowDevInput] = useState(false);

	const handleApplyDevInitData = () => {
		if (customInitData.trim()) {
			localStorage.setItem("ket_dev_init_data", customInitData.trim());
			onRetry();
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-primary/20">
			<div className="w-full max-w-md rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
				<div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
					<ShieldAlert className="w-8 h-8" />
				</div>

				<div className="space-y-2">
					<h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
						{title}
					</h2>
					<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
						{message}
					</p>
				</div>

				<div className="rounded-xl border border-border/60 bg-background/50 p-4 text-left space-y-2 text-xs">
					<div className="font-semibold text-foreground flex items-center gap-1.5">
						<span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
						How to open securely:
					</div>
					<ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
						<li>
							Open Telegram and start chat with your <strong>ket.ai</strong>{" "}
							bot.
						</li>
						<li>
							Tap the <strong>Console</strong> menu button or send{" "}
							<code>/app</code>.
						</li>
						<li>Your session token will be automatically verified.</li>
					</ol>
				</div>

				<div className="flex flex-col gap-2">
					<Button onClick={onRetry} className="w-full flex items-center gap-2">
						<RefreshCw className="w-4 h-4" />
						<span>Retry Connection</span>
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowDevInput(!showDevInput)}
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						<Terminal className="w-3.5 h-3.5 mr-1" />
						{showDevInput ? "Hide Developer Options" : "Developer Test Session"}
					</Button>
				</div>

				{showDevInput && (
					<div className="pt-2 border-t border-border/50 text-left space-y-2 animate-in fade-in duration-200">
						<label
							htmlFor="dev-init-data"
							className="text-[11px] font-medium text-muted-foreground"
						>
							Provide Telegram initData string for local debugging:
						</label>
						<div className="flex gap-2">
							<Input
								id="dev-init-data"
								placeholder="query_id=...&user=..."
								value={customInitData}
								onChange={(e) => setCustomInitData(e.target.value)}
								className="text-xs font-mono"
							/>
							<Button size="sm" onClick={handleApplyDevInitData}>
								<ArrowRight className="w-4 h-4" />
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
