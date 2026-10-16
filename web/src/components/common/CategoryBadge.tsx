import type { FC } from "react";
import { MEMORY_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemoryCategory } from "@/types";

export interface CategoryBadgeProps {
	category?: MemoryCategory | string;
	/** Kept for API compatibility; all variants render as a quiet neutral tag. */
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

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
				variant === "outline"
					? "border-border text-muted-foreground"
					: "border-transparent bg-secondary text-muted-foreground",
				className,
			)}
		>
			{showDot && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
			<span>{meta.label.toLowerCase()}</span>
		</span>
	);
};
