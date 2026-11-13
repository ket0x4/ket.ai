import type { FC } from "react";
import { MEMORY_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemoryCategory } from "@/types";

export interface CategoryBadgeProps {
	category?: MemoryCategory | string;
	className?: string;
}

export const CategoryBadge: FC<CategoryBadgeProps> = ({
	category = "PROFILE",
	className,
}) => {
	const catKey = (category || "PROFILE").toUpperCase() as MemoryCategory;
	const meta = MEMORY_CATEGORIES[catKey] || MEMORY_CATEGORIES.PROFILE;

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border border-transparent bg-secondary px-2 py-0.5 text-[11px] font-medium leading-none text-muted-foreground",
				className,
			)}
		>
			{meta.label.toLowerCase()}
		</span>
	);
};
