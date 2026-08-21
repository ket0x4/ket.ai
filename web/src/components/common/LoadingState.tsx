import { Loader2 } from "lucide-react";
import type { ElementType, FC } from "react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
	icon?: ElementType;
	text?: string;
	className?: string;
	iconClassName?: string;
}

export const LoadingState: FC<LoadingStateProps> = ({
	icon: Icon = Loader2,
	text = "Loading...",
	className,
	iconClassName = "w-6 h-6 animate-spin text-primary",
}) => {
	return (
		<div
			className={cn(
				"py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3",
				className,
			)}
		>
			<Icon className={iconClassName} />
			<span className="text-xs">{text}</span>
		</div>
	);
};
