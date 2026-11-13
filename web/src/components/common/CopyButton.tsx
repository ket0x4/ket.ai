import { Check, Copy } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/useClipboard";

export interface CopyButtonProps {
	text: string;
	successMessage?: string;
}

export const CopyButton: FC<CopyButtonProps> = ({
	text,
	successMessage = "Copied to clipboard!",
}) => {
	const { copied, copy } = useClipboard({ successMessage });

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => copy(text)}
			className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
		>
			{copied ? (
				<>
					<Check className="h-3.5 w-3.5 text-emerald-400" />
					<span className="text-emerald-400">Copied</span>
				</>
			) : (
				<>
					<Copy className="h-3.5 w-3.5" />
					<span>Copy</span>
				</>
			)}
		</Button>
	);
};
