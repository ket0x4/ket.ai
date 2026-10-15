import { Loader2 } from "lucide-react";
import type { ElementType, FC, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalFooterProps {
	onCancel: () => void;
	isSubmitting: boolean;
	submitText: string;
	submittingText?: string;
	submitIcon?: ElementType;
	cancelText?: string;
	children?: ReactNode;
	className?: string;
}

export const ModalFooter: FC<ModalFooterProps> = ({
	onCancel,
	isSubmitting,
	submitText,
	submittingText,
	submitIcon: SubmitIcon,
	cancelText = "Cancel",
	children,
	className,
}) => {
	return (
		<DialogFooter className={cn("gap-2 pt-2 sm:gap-2", className)}>
			{children}
			<Button
				type="button"
				variant="outline"
				onClick={onCancel}
				disabled={isSubmitting}
			>
				{cancelText}
			</Button>
			<Button type="submit" disabled={isSubmitting} className="gap-1.5">
				{isSubmitting ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					SubmitIcon && <SubmitIcon className="h-4 w-4" />
				)}
				<span>
					{isSubmitting ? (submittingText ?? submitText) : submitText}
				</span>
			</Button>
		</DialogFooter>
	);
};
