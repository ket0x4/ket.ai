import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { MEMORY_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemoryCategory } from "@/types";

export interface CategoryBadgeProps {
	category?: MemoryCategory | string;
	variant?: "badge" | "chip" | "outline";
	showDot?: boolean;
	className?: string;
}

export const CategoryBadge: FC<CategoryBadgeProps> = ({
	category = "PROFILE",
	variant = "badge",
	showDot = false,
	className,
}) => {
	const catKey = (category || "PROFILE").toUpperCase() as MemoryCategory;
	const meta = MEMORY_CATEGORIES[catKey] || MEMORY_CATEGORIES.PROFILE;

	if (variant === "chip") {
		return (
			<Badge
				variant="outline"
				className={cn(
					"text-[10px] font-mono px-2 py-0.5 gap-1",
					meta.chipBg,
					meta.textColor,
					meta.chipBorder,
					className,
				)}
			>
				{showDot && (
					<span className={cn("w-1.5 h-1.5 rounded-full", meta.dotColor)} />
				)}
				<span>{meta.label}</span>
			</Badge>
		);
	}

	return (
		<Badge
			variant={meta.badgeVariant}
			className={cn("text-[10px] gap-1", className)}
		>
			{showDot && (
				<span className={cn("w-1.5 h-1.5 rounded-full", meta.dotColor)} />
			)}
			<span>{meta.label}</span>
		</Badge>
	);
};
