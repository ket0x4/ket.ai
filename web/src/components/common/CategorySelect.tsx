import type { FC } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MEMORY_CATEGORY_LIST } from "@/lib/constants";
import type { MemoryCategory } from "@/types";

export interface CategorySelectProps {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	includeAllOption?: boolean;
	allOptionLabel?: string;
	placeholder?: string;
}

export const CategorySelect: FC<CategorySelectProps> = ({
	id,
	value,
	onValueChange,
	includeAllOption = false,
	allOptionLabel = "All Categories",
	placeholder = "Select Category",
}) => {
	return (
		<Select
			value={value}
			onValueChange={(val) => onValueChange(val as MemoryCategory | "all")}
		>
			<SelectTrigger id={id} className="w-full text-xs h-9">
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
						<span className="font-medium text-foreground">
							{cat.label.toLowerCase()}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
