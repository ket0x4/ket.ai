import type { ElementType, FC } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface AppNavItem {
	value: string;
	icon: ElementType;
	label: string;
}

interface AppNavProps {
	items: AppNavItem[];
}

export const AppNav: FC<AppNavProps> = ({ items }) => {
	return (
		<nav
			aria-label="Primary"
			className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
		>
			<div className="mx-auto w-full max-w-md">
				<TabsList>
					{items.map(({ value, icon: Icon, label }) => (
						<TabsTrigger key={value} value={value}>
							<Icon aria-hidden />
							<span>{label}</span>
						</TabsTrigger>
					))}
				</TabsList>
			</div>
		</nav>
	);
};
