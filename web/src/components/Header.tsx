import { Bot, ShieldCheck, ShieldOff } from "lucide-react";
import type { FC } from "react";
import { USER_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TelegramUser, UserRole } from "@/types";

interface HeaderProps {
	user: TelegramUser | null;
	role: UserRole;
	isOnline?: boolean;
	isOptedOut?: boolean;
	isUpdating?: boolean;
	onToggleOptOut?: () => void;
}

export const Header: FC<HeaderProps> = ({
	user,
	role,
	isOnline = true,
	isOptedOut = false,
	isUpdating = false,
	onToggleOptOut,
}) => {
	const roleMeta = USER_ROLES[role] || USER_ROLES.user;
	const RoleIcon = roleMeta.icon;

	return (
		<header className="sticky top-0 z-30 border-b border-border bg-background">
			<div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between gap-4 px-4">
				<div className="flex min-w-0 items-center gap-2">
					<span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<Bot className="h-3.5 w-3.5" />
					</span>
					<span className="text-sm font-semibold tracking-tight">ket.ai</span>
					<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span
							className={cn(
								"h-1.5 w-1.5 rounded-full",
								isOnline ? "bg-emerald-500" : "bg-muted-foreground",
							)}
						/>
						{isOnline ? "Online" : "Offline"}
					</span>
				</div>

				<div className="flex items-center gap-1">
					<span
						role="img"
						className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground"
						title={roleMeta.label}
						aria-label={roleMeta.label}
					>
						<RoleIcon className="h-3.5 w-3.5" />
					</span>

					{user && (
						<button
							type="button"
							onClick={onToggleOptOut}
							disabled={isUpdating}
							aria-label={
								isOptedOut
									? "Opted out. Click to opt in."
									: "Active. Click to opt out."
							}
							aria-pressed={isOptedOut}
							className={cn(
								"flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50",
								isOptedOut
									? "text-rose-400 hover:bg-rose-500/10"
									: "text-emerald-400 hover:bg-emerald-500/10",
							)}
							title={
								isOptedOut
									? "Opted out — the bot ignores your messages. Click to opt in."
									: "Active — the bot processes your messages. Click to opt out."
							}
						>
							{isOptedOut ? (
								<ShieldOff className="h-3.5 w-3.5" />
							) : (
								<ShieldCheck className="h-3.5 w-3.5" />
							)}
						</button>
					)}
				</div>
			</div>
		</header>
	);
};
