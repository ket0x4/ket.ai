import type { ElementType, FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
	icon: ElementType;
	title: string;
	description: string;
	action?: ReactNode;
	className?: string;
	bordered?: boolean;
}

export const EmptyState: FC<EmptyStateProps> = ({
	icon: Icon,
	title,
	description,
	action,
	className,
	bordered = true,
}) => {
	return (
		<div
			className={cn(
				"py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3",
				bordered &&
					"border border-dashed border-border/60 rounded-2xl bg-card/30 p-6",
				className,
			)}
		>
			<Icon className="w-8 h-8 opacity-40 text-muted-foreground" />
			<div className="text-sm font-medium text-foreground">{title}</div>
			<p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
				{description}
			</p>
			{action && <div className="mt-1">{action}</div>}
		</div>
	);
};
