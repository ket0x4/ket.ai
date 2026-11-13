import type { ElementType, FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
	icon?: ElementType;
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
	icon: Icon,
	title,
	description,
	action,
	className,
}) => {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-1.5 py-10 text-center",
				className,
			)}
		>
			{Icon && <Icon className="h-5 w-5 text-muted-foreground/50" />}
			<div className="text-sm font-medium text-foreground">{title}</div>
			{description && (
				<p className="max-w-[32ch] text-xs leading-relaxed text-muted-foreground">
					{description}
				</p>
			)}
			{action && <div className="mt-1.5">{action}</div>}
		</div>
	);
};
