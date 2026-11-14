import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface ModalFooterProps {
	onCancel: () => void;
	isSubmitting: boolean;
	submitText: string;
	submittingText?: string;
}

export const ModalFooter: FC<ModalFooterProps> = ({
	onCancel,
	isSubmitting,
	submitText,
	submittingText,
}) => {
	return (
		<DialogFooter>
			<Button
				type="button"
				variant="outline"
				onClick={onCancel}
				disabled={isSubmitting}
			>
				Cancel
			</Button>
			<Button type="submit" disabled={isSubmitting}>
				<span>
					{isSubmitting ? (submittingText ?? submitText) : submitText}
				</span>
			</Button>
		</DialogFooter>
	);
};
