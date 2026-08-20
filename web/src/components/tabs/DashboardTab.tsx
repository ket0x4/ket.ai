import {
	Activity,
	ArrowUpRight,
	Brain,
	CheckCircle2,
	Cpu,
	Database,
	Layers,
	MessageSquare,
	Server,
	Sparkles,
	Users,
} from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatUptime } from "@/lib/utils";
import type { StatsResponse, UserRole } from "@/types";

// Subcomponent: Owner metrics
const OwnerMetricsGrid: FC<{ stats: StatsResponse | null }> = ({ stats }) => (
	<>
		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Registered Groups</span>
					<Users className="w-4 h-4 text-blue-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.totalChats ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Total chat contexts
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Whitelisted</span>
					<CheckCircle2 className="w-4 h-4 text-emerald-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
					{stats?.allowedChats ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Active authorized groups
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Total Memories</span>
					<Brain className="w-4 h-4 text-purple-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.totalMemories ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Semantic fact embeddings
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Messages</span>
					<MessageSquare className="w-4 h-4 text-amber-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.totalMessages ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Processed chat turns
				</span>
			</CardContent>
		</Card>
	</>
);

// Subcomponent: Admin metrics
const AdminMetricsGrid: FC<{ stats: StatsResponse | null }> = ({ stats }) => (
	<>
		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Managed Groups</span>
					<Users className="w-4 h-4 text-blue-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.managedGroupsCount ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Where you are admin
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Group Memories</span>
					<Brain className="w-4 h-4 text-purple-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.totalMemories ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Saved in your groups
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card col-span-2">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Group Messages</span>
					<MessageSquare className="w-4 h-4 text-emerald-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
					{stats?.totalMessages ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Across managed channels
				</span>
			</CardContent>
		</Card>
	</>
);

// Subcomponent: User metrics
const UserMetricsGrid: FC<{ stats: StatsResponse | null }> = ({ stats }) => (
	<>
		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">My Saved Facts</span>
					<Brain className="w-4 h-4 text-blue-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-400">
					{stats?.totalMemories ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Personal memory records
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">My Groups</span>
					<Users className="w-4 h-4 text-purple-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.totalGroups ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Active group memberships
				</span>
			</CardContent>
		</Card>

		<Card className="glass-card col-span-2">
			<CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
				<div className="flex items-center justify-between text-muted-foreground">
					<span className="text-xs font-medium">Recorded Messages</span>
					<MessageSquare className="w-4 h-4 text-amber-400" />
				</div>
				<div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
					{stats?.totalMessages ?? 0}
				</div>
				<span className="text-[11px] text-muted-foreground">
					Recorded interactions
				</span>
			</CardContent>
		</Card>
	</>
);

// Subcomponent: Memory breakdown & system info
const MemoryDistributionCard: FC<{
	stats: StatsResponse | null;
	role: UserRole;
	onRefresh: () => void;
}> = ({ stats, role, onRefresh }) => {
	const catStats = stats?.categoryStats || {
		PROFILE: 0,
		DYNAMIC: 0,
		TEMPORARY: 0,
	};
	const totalSum =
		(catStats.PROFILE || 0) +
			(catStats.DYNAMIC || 0) +
			(catStats.TEMPORARY || 0) || 1;
	const pPct = Math.round(((catStats.PROFILE || 0) / totalSum) * 100);
	const dPct = Math.round(((catStats.DYNAMIC || 0) / totalSum) * 100);
	const tPct = Math.max(0, 100 - pPct - dPct);

	return (
		<Card className="glass-card">
			<CardHeader className="pb-3 flex flex-row items-center justify-between">
				<div>
					<CardTitle className="text-base flex items-center gap-2">
						<Layers className="w-4 h-4 text-primary" />
						<span>Memory Knowledge Distribution</span>
					</CardTitle>
					<CardDescription>
						Classification of active memory vectors in the vector graph.
					</CardDescription>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={onRefresh}
					className="h-8 text-xs"
				>
					Refresh
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="h-3 w-full rounded-full bg-zinc-800 flex overflow-hidden p-0.5 gap-0.5">
					<div
						style={{ width: `${pPct}%` }}
						className="h-full bg-blue-500 rounded-l-full transition-all duration-500 hover:brightness-110"
						title={`PROFILE: ${catStats.PROFILE} (${pPct}%)`}
					/>
					<div
						style={{ width: `${dPct}%` }}
						className="h-full bg-emerald-500 transition-all duration-500 hover:brightness-110"
						title={`DYNAMIC: ${catStats.DYNAMIC} (${dPct}%)`}
					/>
					<div
						style={{ width: `${tPct}%` }}
						className="h-full bg-amber-500 rounded-r-full transition-all duration-500 hover:brightness-110"
						title={`TEMPORARY: ${catStats.TEMPORARY} (${tPct}%)`}
					/>
				</div>

				<div className="grid grid-cols-3 gap-2 text-xs pt-1">
					<div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
						<span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
						<div className="truncate">
							<span className="font-semibold text-blue-400">PROFILE: </span>
							<span className="font-mono text-foreground font-bold">
								{catStats.PROFILE || 0}
							</span>
							<span className="text-muted-foreground text-[10px] ml-1">
								({pPct}%)
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
						<span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
						<div className="truncate">
							<span className="font-semibold text-emerald-400">DYNAMIC: </span>
							<span className="font-mono text-foreground font-bold">
								{catStats.DYNAMIC || 0}
							</span>
							<span className="text-muted-foreground text-[10px] ml-1">
								({dPct}%)
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
						<span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
						<div className="truncate">
							<span className="font-semibold text-amber-400">TEMPORARY: </span>
							<span className="font-mono text-foreground font-bold">
								{catStats.TEMPORARY || 0}
							</span>
							<span className="text-muted-foreground text-[10px] ml-1">
								({tPct}%)
							</span>
						</div>
					</div>
				</div>

				{role === "owner" && (
					<div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
						<div className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40">
							<Activity className="w-4 h-4 text-emerald-400 shrink-0" />
							<div>
								<div className="text-[10px] text-muted-foreground uppercase font-medium">
									Uptime
								</div>
								<div className="font-semibold font-mono text-foreground">
									{formatUptime(stats?.uptimeSeconds ?? 0)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40">
							<Cpu className="w-4 h-4 text-blue-400 shrink-0" />
							<div>
								<div className="text-[10px] text-muted-foreground uppercase font-medium">
									RAM Usage
								</div>
								<div className="font-semibold font-mono text-foreground">
									{stats?.memoryUsageMb ?? 0} MB
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40">
							<Database className="w-4 h-4 text-purple-400 shrink-0" />
							<div>
								<div className="text-[10px] text-muted-foreground uppercase font-medium">
									DB Size
								</div>
								<div className="font-semibold font-mono text-foreground">
									{formatBytes(stats?.dbSizeBytes ?? 0)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50 border border-border/40">
							<Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
							<div>
								<div className="text-[10px] text-muted-foreground uppercase font-medium">
									Active Model
								</div>
								<div
									className="font-semibold font-mono text-foreground truncate max-w-[110px]"
									title={stats?.model}
								>
									{stats?.model || "gemini"}
								</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

// Subcomponent: Active chats list
const TopActiveGroupsCard: FC<{
	topChats?: StatsResponse["topChats"];
	onNavigateToGroups: () => void;
}> = ({ topChats, onNavigateToGroups }) => (
	<Card className="glass-card">
		<CardHeader className="pb-3 flex flex-row items-center justify-between">
			<div>
				<CardTitle className="text-base flex items-center gap-2">
					<Users className="w-4 h-4 text-primary" />
					<span>Active Groups</span>
				</CardTitle>
				<CardDescription>
					Recent Telegram channels ordered by activity volume.
				</CardDescription>
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={onNavigateToGroups}
				className="flex items-center gap-1 text-xs"
			>
				<span>View All</span>
				<ArrowUpRight className="w-3.5 h-3.5" />
			</Button>
		</CardHeader>
		<CardContent>
			{topChats && topChats.length > 0 ? (
				<div className="divide-y divide-border/40">
					{topChats.map((c) => (
						<div
							key={c.chat_id}
							className="py-2.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
						>
							<div className="min-w-0">
								<div className="font-medium text-foreground truncate text-sm">
									{c.title || `Group (${c.chat_id})`}
								</div>
								<div className="text-[11px] text-muted-foreground font-mono">
									{c.chat_id}
								</div>
							</div>
							<div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-semibold text-xs">
								<MessageSquare className="w-3 h-3" />
								<span>{c.message_count} msgs</span>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
					<Server className="w-6 h-6 opacity-40" />
					<span>No active groups recorded yet.</span>
				</div>
			)}
		</CardContent>
	</Card>
);

interface DashboardTabProps {
	stats: StatsResponse | null;
	role: UserRole;
	isLoading: boolean;
	onNavigateToGroups: () => void;
	onRefresh: () => void;
}

export const DashboardTab: FC<DashboardTabProps> = ({
	stats,
	role,
	isLoading,
	onNavigateToGroups,
	onRefresh,
}) => {
	if (isLoading && !stats) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
				<Activity className="w-8 h-8 animate-spin text-primary" />
				<span className="text-sm">Loading telemetry & metrics...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
				{role === "owner" ? (
					<OwnerMetricsGrid stats={stats} />
				) : role === "admin" ? (
					<AdminMetricsGrid stats={stats} />
				) : (
					<UserMetricsGrid stats={stats} />
				)}
			</div>

			{role !== "user" && (
				<MemoryDistributionCard
					stats={stats}
					role={role}
					onRefresh={onRefresh}
				/>
			)}

			<TopActiveGroupsCard
				topChats={stats?.topChats}
				onNavigateToGroups={onNavigateToGroups}
			/>
		</div>
	);
};
