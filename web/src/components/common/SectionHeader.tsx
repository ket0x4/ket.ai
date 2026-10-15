import type { ElementType, FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
	icon?: ElementType;
	title: string;
	description?: string;
	actions?: ReactNode;
	className?: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({
	icon: Icon,
	title,
	description,
	actions,
	className,
}) => {
	return (
		<div
			className={cn(
				"flex flex-col justify-between gap-3 sm:flex-row sm:items-center",
				className,
			)}
		>
			<div className="min-w-0">
				<h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
					{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
					<span>{title}</span>
				</h2>
				{description && (
					<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
				)}
			</div>
			{actions && (
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{actions}
				</div>
			)}
		</div>
	);
};
