import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default:
					"border-transparent bg-primary/20 text-primary hover:bg-primary/30 border-primary/30",
				secondary:
					"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive:
					"border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30",
				outline: "text-foreground border-border",
				success:
					"border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
				warning:
					"border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
				profile: "border-blue-500/30 bg-blue-500/15 text-blue-400",
				dynamic: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
				temporary: "border-amber-500/30 bg-amber-500/15 text-amber-400",
				owner:
					"border-purple-500/30 bg-purple-500/15 text-purple-300 font-bold",
				admin: "border-blue-500/30 bg-blue-500/15 text-blue-300 font-semibold",
				user: "border-zinc-700 bg-zinc-800 text-zinc-300",
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
