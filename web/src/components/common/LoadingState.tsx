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
				"flex items-center justify-center py-10 text-xs text-muted-foreground",
				className,
			)}
		>
			{text}
		</div>
	);
};
