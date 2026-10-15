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
	onToggleOptOut?: () => void;
}

export const Header: FC<HeaderProps> = ({
	user,
	role,
	isOnline = true,
	isOptedOut = false,
	onToggleOptOut,
}) => {
	const roleMeta = USER_ROLES[role] || USER_ROLES.user;
	const RoleIcon = roleMeta.icon;

	const displayName = user
		? user.first_name + (user.last_name ? ` ${user.last_name}` : "")
		: "Guest";

	return (
		<header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
			<div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
				{/* Brand */}
				<div className="flex min-w-0 items-center gap-2.5">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<Bot className="h-4 w-4" />
					</div>
					<span className="text-sm font-semibold tracking-tight">ket.ai</span>
					<span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
						<span
							className={cn(
								"h-1.5 w-1.5 rounded-full",
								isOnline ? "bg-emerald-500" : "bg-muted-foreground",
							)}
						/>
						{isOnline ? "Online" : "Connecting"}
					</span>
				</div>

				{/* User */}
				<div className="flex min-w-0 items-center gap-2.5">
					<div className="hidden min-w-0 text-right sm:block">
						<div className="truncate text-xs font-medium leading-tight">
							{displayName}
						</div>
						{user?.username && (
							<div className="truncate font-mono text-[11px] text-muted-foreground">
								@{user.username}
							</div>
						)}
					</div>

					<span className="flex items-center gap-1 rounded-md border border-border px-1.5 py-1 text-[11px] text-muted-foreground">
						<RoleIcon className="h-3 w-3" />
						<span className="hidden sm:inline">{roleMeta.label}</span>
					</span>

					{user && (
						<button
							type="button"
							onClick={onToggleOptOut}
							className={cn(
								"flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors",
								isOptedOut
									? "text-rose-400 hover:bg-rose-500/10"
									: "text-emerald-400 hover:bg-emerald-500/10",
							)}
							title={
								isOptedOut
									? "Opted out — bot ignores your messages. Click to opt in."
									: "Active — bot processes your messages. Click to opt out."
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
