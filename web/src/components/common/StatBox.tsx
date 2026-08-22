import type { ElementType, FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatBoxProps {
	icon?: ElementType;
	iconColor?: string;
	label: string;
	value: ReactNode;
	title?: string;
	layout?: "horizontal" | "vertical";
	className?: string;
}

export const StatBox: FC<StatBoxProps> = ({
	icon: Icon,
	iconColor = "text-primary",
	label,
	value,
	title,
	layout = "horizontal",
	className,
}) => {
	if (layout === "vertical") {
		return (
			<div className={cn("text-center", className)}>
				<div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
					{Icon && <Icon className={cn("w-3 h-3", iconColor)} />}
					<span>{label}</span>
				</div>
				<div
					className="font-semibold font-mono text-foreground mt-0.5"
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
				"flex items-center gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border/40 min-w-0 flex-1",
				className,
			)}
		>
			{Icon && <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />}
			<div className="min-w-0 flex-1">
				<div className="text-[10px] text-muted-foreground uppercase font-medium truncate">
					{label}
				</div>
				<div
					className="font-semibold font-mono text-foreground truncate"
					title={title}
				>
					{value}
				</div>
			</div>
		</div>
	);
};
