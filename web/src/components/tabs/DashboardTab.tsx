import { ArrowRight, MessageSquare } from "lucide-react";
import type { FC } from "react";
import {
	EmptyState,
	LoadingState,
	PageHeader,
	RefreshButton,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMORY_CATEGORY_LIST } from "@/lib/constants";
import { cn, formatBytes, formatCount, formatUptime } from "@/lib/utils";
import type { StatsResponse, UserRole } from "@/types";

interface OverviewMetric {
	label: string;
	value: number | string;
}

const METRICS_BY_ROLE: Record<
	UserRole,
	(stats: StatsResponse | null) => OverviewMetric[]
> = {
	owner: (s) => [
		{ label: "Groups", value: s?.totalChats ?? 0 },
		{ label: "Memories", value: s?.totalMemories ?? 0 },
		{ label: "Messages", value: s?.totalMessages ?? 0 },
	],
	admin: (s) => [
		{ label: "Groups", value: s?.managedGroupsCount ?? 0 },
		{ label: "Memories", value: s?.totalMemories ?? 0 },
		{ label: "Messages", value: s?.totalMessages ?? 0 },
	],
	user: (s) => [
		{ label: "Facts", value: s?.totalMemories ?? 0 },
		{ label: "Groups", value: s?.totalGroups ?? 0 },
		{ label: "Messages", value: s?.totalMessages ?? 0 },
	],
};

const SWATCHES = ["bg-primary", "bg-primary/55", "bg-primary/25"];

const MemorySummary: FC<{
	stats: StatsResponse | null;
	role: UserRole;
}> = ({ stats, role }) => {
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

	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between py-3">
				<CardTitle>Memory</CardTitle>
				<span className="font-mono text-xs text-muted-foreground tnum">
					{formatCount(totalSum)}
				</span>
			</CardHeader>
			<CardContent className="space-y-3 pt-3">
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

				<div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
					{MEMORY_CATEGORY_LIST.map((cat, idx) => (
						<span key={cat.value} className="flex min-w-0 items-center gap-1.5">
							<span
								className={cn(
									"h-1.5 w-1.5 shrink-0 rounded-full",
									SWATCHES[idx],
								)}
							/>
							<span className="truncate">{cat.label.toLowerCase()}</span>
							<span className="font-mono text-foreground tnum">
								{formatCount(catStats[cat.value] || 0)}
							</span>
						</span>
					))}
				</div>

				{role === "owner" && (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
						<span className="font-mono tnum">
							Up {formatUptime(stats?.uptimeSeconds ?? 0)}
						</span>
						<span className="font-mono tnum">
							{stats?.memoryUsageMb ?? 0} MB RAM
						</span>
						<span className="font-mono tnum">
							{formatBytes(stats?.dbSizeBytes ?? 0)} DB
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

const ActiveGroupsCard: FC<{
	topChats?: StatsResponse["topChats"];
	onNavigateToGroups: () => void;
}> = ({ topChats, onNavigateToGroups }) => (
	<Card>
		<CardHeader className="flex-row items-center justify-between py-3">
			<CardTitle>Active groups</CardTitle>
			<Button
				variant="ghost"
				size="sm"
				onClick={onNavigateToGroups}
				className="-mr-2 h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
			>
				<span>All</span>
				<ArrowRight className="h-3 w-3" />
			</Button>
		</CardHeader>
		<CardContent className="pt-1">
			{topChats && topChats.length > 0 ? (
				<div className="divide-y divide-border/60">
					{topChats.map((c) => (
						<div
							key={c.chat_id}
							className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
						>
							<span className="min-w-0 truncate text-sm" dir="auto">
								{c.title || `Group ${c.chat_id}`}
							</span>
							<span className="shrink-0 font-mono text-[11px] text-muted-foreground tnum">
								{formatCount(c.message_count)}
							</span>
						</div>
					))}
				</div>
			) : (
				<EmptyState
					icon={MessageSquare}
					title="No activity"
					description="Groups with messages will appear here."
					className="py-6"
				/>
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
		return <LoadingState />;
	}

	const metrics = METRICS_BY_ROLE[role](stats);

	return (
		<div className="space-y-4">
			<PageHeader
				title="Overview"
				actions={<RefreshButton onClick={onRefresh} isLoading={isLoading} />}
			/>

			<div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card">
				{metrics.map((metric) => (
					<div key={metric.label} className="min-w-0 px-3 py-3">
						<div className="truncate text-[11px] text-muted-foreground">
							{metric.label}
						</div>
						<div className="mt-0.5 truncate text-xl font-semibold tracking-tight tnum">
							{typeof metric.value === "number"
								? formatCount(metric.value)
								: metric.value}
						</div>
					</div>
				))}
			</div>

			{role !== "user" && <MemorySummary stats={stats} role={role} />}

			<ActiveGroupsCard
				topChats={stats?.topChats}
				onNavigateToGroups={onNavigateToGroups}
			/>
		</div>
	);
};
