import {
	Activity,
	ArrowRight,
	Brain,
	Cpu,
	Database,
	MessageSquare,
	ShieldCheck,
	ShieldOff,
	Sparkles,
	Users,
} from "lucide-react";
import type { FC } from "react";
import {
	EmptyState,
	LoadingState,
	MetricCard,
	type MetricCardProps,
	RefreshButton,
	StatBox,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MEMORY_CATEGORY_LIST } from "@/lib/constants";
import { cn, formatBytes, formatUptime } from "@/lib/utils";
import type { StatsResponse, UserRole } from "@/types";

const METRICS_BY_ROLE: Record<
	UserRole,
	(s: StatsResponse | null) => MetricCardProps[]
> = {
	owner: (s) => [
		{
			title: "Groups",
			value: s?.totalChats ?? 0,
			icon: Users,
			description: `${s?.allowedChats ?? 0} whitelisted`,
		},
		{
			title: "Memories",
			value: s?.totalMemories ?? 0,
			icon: Brain,
			description: "Saved facts",
		},
		{
			title: "Messages",
			value: s?.totalMessages ?? 0,
			icon: MessageSquare,
			description: "Processed turns",
		},
		{
			title: "Active model",
			value: s?.model || "gemini",
			icon: Sparkles,
			description: "Inference engine",
		},
	],
	admin: (s) => [
		{
			title: "Managed groups",
			value: s?.managedGroupsCount ?? 0,
			icon: Users,
			description: "Where you are admin",
		},
		{
			title: "Memories",
			value: s?.totalMemories ?? 0,
			icon: Brain,
			description: "In your groups",
		},
		{
			title: "Messages",
			value: s?.totalMessages ?? 0,
			icon: MessageSquare,
			description: "Across channels",
			colSpan: 2,
		},
	],
	user: (s) => [
		{
			title: "Saved facts",
			value: s?.totalMemories ?? 0,
			icon: Brain,
			description: "Personal records",
		},
		{
			title: "Groups",
			value: s?.totalGroups ?? 0,
			icon: Users,
			description: "Memberships",
		},
		{
			title: "Messages",
			value: s?.totalMessages ?? 0,
			icon: MessageSquare,
			description: "Recorded interactions",
			colSpan: 2,
		},
	],
};

const SWATCHES = ["bg-primary", "bg-primary/55", "bg-primary/25"];

const MemoryCard: FC<{
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
		(catStats.TEMPORARY || 0);

	const share = (n: number) =>
		totalSum > 0 ? Math.round((n / totalSum) * 100) : 0;

	const systemMetrics = [
		{
			icon: Activity,
			label: "Uptime",
			value: formatUptime(stats?.uptimeSeconds ?? 0),
		},
		{ icon: Cpu, label: "RAM", value: `${stats?.memoryUsageMb ?? 0} MB` },
		{
			icon: Database,
			label: "DB size",
			value: formatBytes(stats?.dbSizeBytes ?? 0),
		},
	];

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between">
				<div>
					<CardTitle>Memory</CardTitle>
					<CardDescription>How saved facts are classified.</CardDescription>
				</div>
				<RefreshButton variant="ghost" size="icon" onClick={onRefresh} />
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
					{MEMORY_CATEGORY_LIST.map((cat, idx) => (
						<div
							key={cat.value}
							style={{ width: `${share(catStats[cat.value] || 0)}%` }}
							className={cn("h-full transition-all", SWATCHES[idx])}
							title={`${cat.value}: ${catStats[cat.value] || 0}`}
						/>
					))}
				</div>

				<div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border sm:grid-cols-3">
					{MEMORY_CATEGORY_LIST.map((cat, idx) => (
						<div
							key={cat.value}
							className="flex items-center justify-between gap-2 bg-card px-3 py-2.5"
						>
							<span className="flex min-w-0 items-center gap-2">
								<span
									className={cn("h-1.5 w-1.5 rounded-full", SWATCHES[idx])}
								/>
								<span className="truncate text-xs text-muted-foreground">
									{cat.label.toLowerCase()}
								</span>
							</span>
							<span className="flex items-baseline gap-1.5">
								<span className="font-mono text-xs tnum">
									{catStats[cat.value] || 0}
								</span>
								<span className="text-[11px] text-muted-foreground tnum">
									{share(catStats[cat.value] || 0)}%
								</span>
							</span>
						</div>
					))}
				</div>

				{role === "owner" && (
					<div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
						{systemMetrics.map((item) => (
							<StatBox
								key={item.label}
								icon={item.icon}
								label={item.label}
								value={item.value}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

const TopActiveGroupsCard: FC<{
	topChats?: StatsResponse["topChats"];
	onNavigateToGroups: () => void;
}> = ({ topChats, onNavigateToGroups }) => (
	<Card>
		<CardHeader className="flex-row items-center justify-between">
			<div>
				<CardTitle>Active groups</CardTitle>
				<CardDescription>Ranked by message volume.</CardDescription>
			</div>
			<Button variant="ghost" size="sm" onClick={onNavigateToGroups}>
				<span>All groups</span>
				<ArrowRight className="h-3.5 w-3.5" />
			</Button>
		</CardHeader>
		<CardContent>
			{topChats && topChats.length > 0 ? (
				<div className="divide-y divide-border/60">
					{topChats.map((c) => (
						<div
							key={c.chat_id}
							className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
						>
							<div className="min-w-0 flex-1">
								<div
									className="truncate text-sm font-medium text-foreground"
									dir="auto"
								>
									{c.title || `Group ${c.chat_id}`}
								</div>
								<div className="truncate font-mono text-[11px] text-muted-foreground">
									{c.chat_id}
								</div>
							</div>
							<span className="shrink-0 font-mono text-xs text-muted-foreground tnum">
								{c.message_count} msgs
							</span>
						</div>
					))}
				</div>
			) : (
				<EmptyState
					icon={MessageSquare}
					title="No activity yet"
					description="Groups with message history will appear here."
					bordered={false}
					className="py-8"
				/>
			)}
		</CardContent>
	</Card>
);

const BotPrivacyCard: FC<{
	isOptedOut?: boolean;
	onToggleOptOut?: (optedOut: boolean) => Promise<void>;
	isUpdating?: boolean;
}> = ({ isOptedOut = false, onToggleOptOut, isUpdating = false }) => {
	return (
		<Card>
			<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<span
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border",
							isOptedOut ? "text-rose-400" : "text-emerald-400",
						)}
					>
						{isOptedOut ? (
							<ShieldOff className="h-4 w-4" />
						) : (
							<ShieldCheck className="h-4 w-4" />
						)}
					</span>
					<div className="min-w-0">
						<div className="text-sm font-medium">
							{isOptedOut ? "Opted out" : "Bot active"}
						</div>
						<p className="text-xs text-muted-foreground">
							{isOptedOut
								? "The bot ignores your messages and saves no memories."
								: "The bot reads, replies, and saves memories in your chats."}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
					<code className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
						/optin /optout
					</code>
					<Switch
						checked={!isOptedOut}
						onCheckedChange={(checked) => onToggleOptOut?.(!checked)}
						disabled={isUpdating}
					/>
				</div>
			</CardContent>
		</Card>
	);
};

interface DashboardTabProps {
	stats: StatsResponse | null;
	role: UserRole;
	isLoading: boolean;
	onNavigateToGroups: () => void;
	onRefresh: () => void;
	isOptedOut?: boolean;
	onToggleOptOut?: (optedOut: boolean) => Promise<void>;
	isUpdatingOptOut?: boolean;
}

export const DashboardTab: FC<DashboardTabProps> = ({
	stats,
	role,
	isLoading,
	onNavigateToGroups,
	onRefresh,
	isOptedOut = false,
	onToggleOptOut,
	isUpdatingOptOut = false,
}) => {
	if (isLoading && !stats) {
		return <LoadingState text="Loading metrics…" />;
	}

	const metricCards = METRICS_BY_ROLE[role](stats);

	return (
		<div className="space-y-4 animate-in fade-in duration-200">
			<BotPrivacyCard
				isOptedOut={isOptedOut}
				onToggleOptOut={onToggleOptOut}
				isUpdating={isUpdatingOptOut}
			/>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{metricCards.map((card) => (
					<MetricCard key={card.title} {...card} />
				))}
			</div>

			{role !== "user" && (
				<MemoryCard stats={stats} role={role} onRefresh={onRefresh} />
			)}

			<TopActiveGroupsCard
				topChats={stats?.topChats}
				onNavigateToGroups={onNavigateToGroups}
			/>
		</div>
	);
};
