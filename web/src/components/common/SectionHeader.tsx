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
				"flex flex-col sm:flex-row gap-2 sm:items-center justify-between",
				className,
			)}
		>
			<div>
				<h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
					{Icon && <Icon className="w-5 h-5 text-primary" />}
					<span>{title}</span>
				</h3>
				{description && (
					<p className="text-xs text-muted-foreground">{description}</p>
				)}
			</div>
			{actions && (
				<div className="flex items-center gap-2 flex-wrap shrink-0">
					{actions}
				</div>
			)}
		</div>
	);
};
