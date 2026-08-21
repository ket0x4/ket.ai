import { Bot } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { USER_ROLES } from "@/lib/constants";
import type { TelegramUser, UserRole } from "@/types";

interface HeaderProps {
	user: TelegramUser | null;
	role: UserRole;
	isOnline?: boolean;
}

export const Header: FC<HeaderProps> = ({ user, role, isOnline = true }) => {
	const roleMeta = USER_ROLES[role] || USER_ROLES.user;
	const RoleIcon = roleMeta.icon;

	const displayName = user
		? user.first_name + (user.last_name ? ` ${user.last_name}` : "")
		: "Guest User";

	return (
		<header className="sticky top-0 z-40 w-full glass-header py-3 px-4 sm:px-6">
			<div className="max-w-6xl mx-auto flex items-center justify-between">
				{/* Brand */}
				<div className="flex items-center gap-3">
					<div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-md shadow-blue-500/20 text-white">
						<Bot className="w-5 h-5" />
						<span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="font-bold text-base tracking-tight text-white">
								ket.ai
							</span>
							<span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
								v7.4
							</span>
						</div>
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
							<span>{isOnline ? "Server Online" : "Connecting..."}</span>
						</div>
					</div>
				</div>

				{/* User Profile */}
				<div className="flex items-center gap-2.5 sm:gap-3 bg-white/5 border border-white/10 rounded-full pl-3 pr-2 py-1 backdrop-blur-md">
					<div className="flex flex-col items-end">
						<span className="text-xs font-semibold text-foreground max-w-[120px] sm:max-w-[160px] truncate">
							{displayName}
						</span>
						{user?.username && (
							<span className="text-[10px] text-muted-foreground font-mono">
								@{user.username}
							</span>
						)}
					</div>
					<Badge
						variant={roleMeta.badgeVariant}
						className="flex items-center gap-1"
					>
						<RoleIcon className={`w-3 h-3 ${roleMeta.iconColor}`} />
						<span>{roleMeta.label}</span>
					</Badge>
				</div>
			</div>
		</header>
	);
};
