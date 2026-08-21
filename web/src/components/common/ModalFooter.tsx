import { Sparkles } from "lucide-react";
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
	submitIcon: SubmitIcon = Sparkles,
	cancelText = "Cancel",
	children,
	className,
}) => {
	return (
		<DialogFooter className={cn("gap-2 sm:gap-0 pt-3", className)}>
			{children}
			<Button
				type="button"
				variant="outline"
				onClick={onCancel}
				disabled={isSubmitting}
			>
				{cancelText}
			</Button>
			<Button
				type="submit"
				disabled={isSubmitting}
				className="gap-1.5 shadow-md shadow-primary/20"
			>
				{isSubmitting ? (
					<Sparkles className="w-4 h-4 animate-spin" />
				) : (
					<SubmitIcon className="w-4 h-4" />
				)}
				<span>
					{isSubmitting ? (submittingText ?? submitText) : submitText}
				</span>
			</Button>
		</DialogFooter>
	);
};
