import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Badges are intentionally quiet. Most states read as neutral; only the
 * single accent and small semantic status colors are allowed.
 */
const badgeVariants = cva(
	"inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap transition-colors focus:outline-none",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary/12 text-primary",
				secondary: "border-transparent bg-secondary text-muted-foreground",
				destructive: "border-transparent bg-destructive/12 text-destructive",
				outline: "text-muted-foreground border-border",
				success: "border-transparent bg-emerald-500/12 text-emerald-400",
				warning: "border-transparent bg-amber-500/12 text-amber-400",
				profile: "border-transparent bg-secondary text-muted-foreground",
				dynamic: "border-transparent bg-secondary text-muted-foreground",
				temporary: "border-transparent bg-secondary text-muted-foreground",
				owner: "border-transparent bg-primary/12 text-primary",
				admin: "border-transparent bg-secondary text-foreground",
				user: "border-transparent bg-secondary text-muted-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge };
