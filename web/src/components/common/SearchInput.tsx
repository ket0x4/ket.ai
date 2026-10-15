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
			<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					"h-9 pl-9 text-xs sm:text-sm",
					showClearButton && value && "pr-8",
					className,
				)}
				{...props}
			/>
			{showClearButton && value && (
				<button
					type="button"
					onClick={handleClear}
					className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
					title="Clear search"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
};
