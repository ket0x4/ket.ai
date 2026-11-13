import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: string;
	actions?: ReactNode;
	className?: string;
}

export const PageHeader: FC<PageHeaderProps> = ({
	title,
	actions,
	className,
}) => {
	return (
		<div className={cn("flex items-center justify-between gap-3", className)}>
			<h1 className="text-base font-semibold tracking-tight">{title}</h1>
			{actions && (
				<div className="flex shrink-0 items-center gap-1.5">{actions}</div>
			)}
		</div>
	);
};
