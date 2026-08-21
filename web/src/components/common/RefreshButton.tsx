import { RefreshCw } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
	onClick: () => void | Promise<void>;
	isLoading?: boolean;
	label?: string;
	variant?: "outline" | "ghost" | "default" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export const RefreshButton: FC<RefreshButtonProps> = ({
	onClick,
	isLoading = false,
	label = "Refresh",
	variant = "outline",
	size = "sm",
	className,
}) => {
	return (
		<Button
			variant={variant}
			size={size}
			onClick={onClick}
			disabled={isLoading}
			className={cn("h-8 text-xs flex items-center gap-1.5", className)}
		>
			<RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
			{label && <span>{label}</span>}
		</Button>
	);
};
