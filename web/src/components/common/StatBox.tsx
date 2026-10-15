import type { ElementType, FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatBoxProps {
	icon?: ElementType;
	/** Kept for API compatibility; icons render neutrally. */
	iconColor?: string;
	label: string;
	value: ReactNode;
	title?: string;
	layout?: "horizontal" | "vertical";
	className?: string;
}

export const StatBox: FC<StatBoxProps> = ({
	icon: Icon,
	label,
	value,
	title,
	layout = "horizontal",
	className,
}) => {
	if (layout === "vertical") {
		return (
			<div className={cn("min-w-0 text-center", className)}>
				<div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
					{Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
					<span>{label}</span>
				</div>
				<div
					className="mt-1 font-mono text-sm font-medium text-foreground tnum"
					title={title}
				>
					{value}
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border/70 bg-background/40 p-2.5",
				className,
			)}
		>
			{Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
			<div className="min-w-0 flex-1">
				<div className="truncate text-[11px] text-muted-foreground">
					{label}
				</div>
				<div
					className="truncate font-mono text-sm font-medium text-foreground tnum"
					title={title}
				>
					{value}
				</div>
			</div>
		</div>
	);
};
