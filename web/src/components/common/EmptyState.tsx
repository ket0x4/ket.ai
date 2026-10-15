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
				"flex flex-col items-center justify-center gap-2 py-14 text-center",
				bordered &&
					"rounded-xl border border-dashed border-border bg-card/40 p-6",
				className,
			)}
		>
			<Icon className="h-6 w-6 text-muted-foreground/50" />
			<div className="text-sm font-medium text-foreground">{title}</div>
			<p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
				{description}
			</p>
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
};
