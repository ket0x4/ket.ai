import type { ElementType, FC } from "react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
	title: string;
	value: string | number;
	icon: ElementType;
	/** Kept for API compatibility; the redesign renders icons neutrally. */
	iconColor?: string;
	description?: string;
	/** Kept for API compatibility. */
	valueColor?: string;
	className?: string;
	colSpan?: 1 | 2;
}

export const MetricCard: FC<MetricCardProps> = ({
	title,
	value,
	icon: Icon,
	description,
	className,
	colSpan = 1,
}) => {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
				colSpan === 2 && "col-span-2",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="text-xs text-muted-foreground">{title}</span>
				<Icon className="h-4 w-4 text-muted-foreground/60" />
			</div>
			<div className="text-2xl font-semibold tracking-tight tnum">{value}</div>
			{description && (
				<span className="-mt-2 text-[11px] text-muted-foreground/80">
					{description}
				</span>
			)}
		</div>
	);
};
