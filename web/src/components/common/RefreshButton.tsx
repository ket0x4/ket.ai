import { RefreshCw } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
	onClick: () => void | Promise<void>;
	isLoading?: boolean;
}

export const RefreshButton: FC<RefreshButtonProps> = ({
	onClick,
	isLoading = false,
}) => {
	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={onClick}
			disabled={isLoading}
			title="Refresh"
			aria-label="Refresh"
		>
			<RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
		</Button>
	);
};
