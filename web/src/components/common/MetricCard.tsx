import type { ElementType, FC } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
	title: string;
	value: string | number;
	icon: ElementType;
	iconColor?: string;
	description?: string;
	valueColor?: string;
	className?: string;
	colSpan?: 1 | 2;
}

export const MetricCard: FC<MetricCardProps> = ({
	title,
	value,
	icon: Icon,
	iconColor = "text-primary",
	description,
	valueColor = "text-foreground",
	className,
	colSpan = 1,
}) => {
	return (
		<Card
			className={cn("glass-card", colSpan === 2 && "col-span-2", className)}
		>
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">{title}</span>
					<Icon className={cn("w-4 h-4", iconColor)} />
				</div>
				<div
					className={cn(
						"text-2xl sm:text-3xl font-bold tracking-tight",
						valueColor,
					)}
				>
					{value}
				</div>
				{description && (
					<span className="text-[11px] text-muted-foreground">
						{description}
					</span>
				)}
			</CardContent>
		</Card>
	);
};
