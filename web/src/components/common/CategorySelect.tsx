import type { FC } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MEMORY_CATEGORY_LIST } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemoryCategory } from "@/types";

export interface CategorySelectProps {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	includeAllOption?: boolean;
	allOptionLabel?: string;
	showDescription?: boolean;
	disabled?: boolean;
	placeholder?: string;
	triggerClassName?: string;
}

export const CategorySelect: FC<CategorySelectProps> = ({
	id,
	value,
	onValueChange,
	includeAllOption = false,
	allOptionLabel = "All Categories",
	showDescription = false,
	disabled = false,
	placeholder = "Select Category",
	triggerClassName,
}) => {
	return (
		<Select
			value={value}
			onValueChange={(val) => onValueChange(val as MemoryCategory | "all")}
			disabled={disabled}
		>
			<SelectTrigger
				id={id}
				className={cn("w-full text-xs h-9 bg-card/60", triggerClassName)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{includeAllOption && (
					<SelectItem value="all" className="text-xs">
						{allOptionLabel}
					</SelectItem>
				)}
				{MEMORY_CATEGORY_LIST.map((cat) => (
					<SelectItem key={cat.value} value={cat.value} className="text-xs">
						{showDescription ? (
							<>
								<span className={`font-medium ${cat.textColor}`}>
									{cat.label}
								</span>{" "}
								— {cat.description}
							</>
						) : (
							<span className={`font-medium ${cat.textColor}`}>
								{cat.label}
							</span>
						)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
