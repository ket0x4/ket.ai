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
	title = "Open in Telegram",
	message = "This console runs inside a Telegram Mini App and verifies your session automatically.",
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
		<div className="flex min-h-[100dvh] items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 text-center">
				<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground">
					<ShieldAlert className="h-5 w-5" />
				</div>

				<div className="space-y-1.5">
					<h2 className="text-base font-semibold tracking-tight">{title}</h2>
					<p className="text-xs leading-relaxed text-muted-foreground">
						{message}
					</p>
				</div>

				<div className="space-y-1.5 rounded-lg border border-border/60 bg-background/40 p-4 text-left text-xs">
					<div className="font-medium text-foreground">How to open</div>
					<ol className="list-inside list-decimal space-y-1 text-muted-foreground">
						<li>Open Telegram and start a chat with your ket.ai bot.</li>
						<li>
							Tap <strong>Console</strong> or send <code>/app</code>.
						</li>
					</ol>
				</div>

				<div className="flex flex-col gap-2">
					<Button onClick={onRetry} className="w-full gap-2">
						<RefreshCw className="h-4 w-4" />
						Retry
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowDevInput(!showDevInput)}
						className="gap-1.5 text-xs"
					>
						<Terminal className="h-3.5 w-3.5" />
						{showDevInput ? "Hide developer options" : "Developer session"}
					</Button>
				</div>

				{showDevInput && (
					<div className="space-y-2 border-t border-border/60 pt-4 text-left">
						<label
							htmlFor="dev-init-data"
							className="text-[11px] text-muted-foreground"
						>
							Paste a Telegram initData string for local debugging:
						</label>
						<div className="flex gap-2">
							<Input
								id="dev-init-data"
								placeholder="query_id=…&user=…"
								value={customInitData}
								onChange={(e) => setCustomInitData(e.target.value)}
								className="font-mono text-xs"
							/>
							<Button size="sm" onClick={handleApplyDevInitData}>
								<ArrowRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
