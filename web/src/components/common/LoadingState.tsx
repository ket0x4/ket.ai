import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
	text?: string;
	className?: string;
}

export const LoadingState: FC<LoadingStateProps> = ({
	text = "Loading",
	className,
}) => {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground",
				className,
			)}
		>
			<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
			<span className="text-xs">{text}</span>
		</div>
	);
};
