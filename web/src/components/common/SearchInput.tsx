import { Search, X } from "lucide-react";
import type { FC, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
	value: string;
	onChange: (value: string) => void;
	onClear?: () => void;
	containerClassName?: string;
	showClearButton?: boolean;
}

export const SearchInput: FC<SearchInputProps> = ({
	value,
	onChange,
	onClear,
	placeholder = "Search...",
	className,
	containerClassName,
	showClearButton = false,
	...props
}) => {
	const handleClear = () => {
		onChange("");
		if (onClear) onClear();
	};

	return (
		<div className={cn("relative flex-1", containerClassName)}>
			<Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
			<Input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					"pl-9 bg-card/60 border-border/80 text-xs sm:text-sm h-9",
					showClearButton && value && "pr-8",
					className,
				)}
				{...props}
			/>
			{showClearButton && value && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
					title="Clear search"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			)}
		</div>
	);
};
