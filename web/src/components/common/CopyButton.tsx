import { Check, Copy } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/useClipboard";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
	text: string;
	label?: string;
	copiedLabel?: string;
	successMessage?: string;
	className?: string;
	size?: "default" | "sm" | "lg" | "icon";
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link"
		| "glass";
}

export const CopyButton: FC<CopyButtonProps> = ({
	text,
	label = "Copy",
	copiedLabel = "Copied",
	successMessage = "Copied to clipboard!",
	className,
	size = "sm",
	variant = "ghost",
}) => {
	const { copied, copy } = useClipboard({ successMessage });

	return (
		<Button
			variant={variant}
			size={size}
			onClick={() => copy(text)}
			className={cn(
				"h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs",
				className,
			)}
		>
			{copied ? (
				<>
					<Check className="w-3.5 h-3.5 text-emerald-400" />
					<span className="text-emerald-400">{copiedLabel}</span>
				</>
			) : (
				<>
					<Copy className="w-3.5 h-3.5" />
					{label && <span>{label}</span>}
				</>
			)}
		</Button>
	);
};
