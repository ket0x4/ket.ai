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
import { formatBytes, formatUptime } from "@/lib/utils";
import type { StatsResponse, UserRole } from "@/types";

function getMetricCards(
	role: UserRole,
	stats: StatsResponse | null,
): MetricCardProps[] {
	if (role === "owner") {
		return [
			{
				title: "Registered Groups",
				value: stats?.totalChats ?? 0,
				icon: Users,
				iconColor: "text-blue-400",
				description: "Total chat contexts",
			},
			{
				title: "Whitelisted",
				value: stats?.allowedChats ?? 0,
				icon: CheckCircle2,
				iconColor: "text-emerald-400",
				valueColor: "text-emerald-400",
				description: "Active authorized groups",
			},
			{
				title: "Total Memories",
				value: stats?.totalMemories ?? 0,
				icon: Brain,
				iconColor: "text-purple-400",
				description: "Semantic fact embeddings",
			},
			{
				title: "Messages",
				value: stats?.totalMessages ?? 0,
				icon: MessageSquare,
				iconColor: "text-amber-400",
				description: "Processed chat turns",
			},
		];
	}

	if (role === "admin") {
		return [
			{
				title: "Managed Groups",
				value: stats?.managedGroupsCount ?? 0,
				icon: Users,
				iconColor: "text-blue-400",
				description: "Where you are admin",
			},
			{
				title: "Memories",
				value: stats?.totalMemories ?? 0,
				icon: Brain,
				iconColor: "text-purple-400",
				description: "Saved in your groups",
			},
			{
				title: "Group Messages",
				value: stats?.totalMessages ?? 0,
				icon: MessageSquare,
				iconColor: "text-emerald-400",
				valueColor: "text-emerald-400",
				description: "Across managed channels",
				colSpan: 2,
			},
		];
	}

	return [
		{
			title: "My Saved Facts",
			value: stats?.totalMemories ?? 0,
			icon: Brain,
			iconColor: "text-blue-400",
			valueColor: "text-blue-400",
			description: "Personal memory records",
		},
		{
			title: "My Groups",
			value: stats?.totalGroups ?? 0,
			icon: Users,
			iconColor: "text-purple-400",
			description: "Active group memberships",
		},
		{
			title: "Recorded Messages",
			value: stats?.totalMessages ?? 0,
			icon: MessageSquare,
			iconColor: "text-amber-400",
			description: "Recorded interactions",
			colSpan: 2,
		},
	];
}

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

	const percentages = {
		PROFILE: Math.round(((catStats.PROFILE || 0) / totalSum) * 100),
		DYNAMIC: Math.round(((catStats.DYNAMIC || 0) / totalSum) * 100),
		TEMPORARY: Math.max(
			0,
			100 -
				Math.round(((catStats.PROFILE || 0) / totalSum) * 100) -
				Math.round(((catStats.DYNAMIC || 0) / totalSum) * 100),
		),
	};

	const systemMetrics = [
		{
			icon: Activity,
			iconColor: "text-emerald-400",
			label: "Uptime",
			value: formatUptime(stats?.uptimeSeconds ?? 0),
		},
		{
			icon: Cpu,
			iconColor: "text-blue-400",
			label: "RAM Usage",
			value: `${stats?.memoryUsageMb ?? 0} MB`,
		},
		{
			icon: Database,
			iconColor: "text-purple-400",
			label: "DB Size",
			value: formatBytes(stats?.dbSizeBytes ?? 0),
		},
		{
			icon: Sparkles,
			iconColor: "text-amber-400",
			label: "Active Model",
			value: stats?.model || "gemini",
			title: stats?.model,
		},
	];

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
				<RefreshButton
					variant="ghost"
					onClick={onRefresh}
					className="h-8 text-xs"
				/>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="h-3 w-full rounded-full bg-zinc-800 flex overflow-hidden p-0.5 gap-0.5">
					{MEMORY_CATEGORY_LIST.map((cat, idx) => (
						<div
							key={cat.value}
							style={{ width: `${percentages[cat.value]}%` }}
							className={`h-full ${cat.barColor} transition-all duration-500 hover:brightness-110 ${
								idx === 0
									? "rounded-l-full"
									: idx === MEMORY_CATEGORY_LIST.length - 1
										? "rounded-r-full"
										: ""
							}`}
							title={`${cat.label}: ${catStats[cat.value] || 0} (${percentages[cat.value]}%)`}
						/>
					))}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
					{MEMORY_CATEGORY_LIST.map((cat) => (
						<div
							key={cat.value}
							className={`flex items-center justify-between gap-2 p-2.5 rounded-lg ${cat.chipBg} border ${cat.chipBorder}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span
									className={`w-2 h-2 rounded-full ${cat.dotColor} shrink-0`}
								/>
								<span className={`font-semibold truncate ${cat.textColor}`}>
									{cat.label}
								</span>
							</div>
							<div className="shrink-0 font-mono flex items-center gap-1">
								<span className="text-foreground font-bold">
									{catStats[cat.value] || 0}
								</span>
								<span className="text-muted-foreground text-[10px]">
									({percentages[cat.value]}%)
								</span>
							</div>
						</div>
					))}
				</div>

				{role === "owner" && (
					<div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
						{systemMetrics.map((item) => (
							<StatBox
								key={item.label}
								icon={item.icon}
								iconColor={item.iconColor}
								label={item.label}
								value={item.value}
								title={item.title}
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
	<Card className="glass-card">
		<CardHeader className="pb-3 flex flex-row items-center justify-between">
			<div>
				<CardTitle className="text-base flex items-center gap-2">
					<Users className="w-4 h-4 text-primary" />
					<span>Active Groups</span>
				</CardTitle>
				<CardDescription>
					Most active Telegram groups ranked by message volume and interaction.
				</CardDescription>
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={onNavigateToGroups}
				className="flex items-center gap-1 text-xs h-8"
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
							<div className="min-w-0 flex-1">
								<div
									className="font-medium text-foreground truncate text-sm"
									dir="auto"
								>
									{c.title || `Group (${c.chat_id})`}
								</div>
								<div className="text-[11px] text-muted-foreground font-mono truncate">
									{c.chat_id}
								</div>
							</div>
							<div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-semibold text-xs">
								<MessageSquare className="w-3 h-3" />
								<span>{c.message_count} messages</span>
							</div>
						</div>
					))}
				</div>
			) : (
				<EmptyState
					icon={Server}
					title="No active groups found"
					description="No registered active groups with message history found yet."
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
		<Card
			className={`glass-card transition-all duration-300 ${
				isOptedOut
					? "border-rose-500/40 bg-rose-500/5 shadow-lg shadow-rose-950/20"
					: "border-border/60 hover:border-primary/40"
			}`}
		>
			<CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
				<div className="space-y-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						{isOptedOut ? (
							<ShieldOff className="w-5 h-5 text-rose-400 shrink-0" />
						) : (
							<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
						)}
						<CardTitle className="text-base font-semibold">
							Bot Privacy & Opt-Out
						</CardTitle>
						<span
							className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border ${
								isOptedOut
									? "bg-rose-500/15 border-rose-500/30 text-rose-300"
									: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
							}`}
						>
							{isOptedOut ? "Opted Out (Ignored)" : "Active (Opted In)"}
						</span>
					</div>
					<CardDescription className="text-xs">
						{isOptedOut
							? "The bot is fully ignoring you across all group and private chats. No memories, text, photos, or voice notes are processed."
							: "The bot processes your text messages, voice, and photos, responds when mentioned or replied to, and saves profile memories."}
					</CardDescription>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span className="text-xs text-muted-foreground hidden sm:inline">
						{isOptedOut ? "Opted Out" : "Opt In"}
					</span>
					<Switch
						checked={isOptedOut}
						onCheckedChange={(checked) => onToggleOptOut?.(checked)}
						disabled={isUpdating}
						className="data-[state=checked]:bg-rose-600 data-[state=unchecked]:bg-emerald-600"
					/>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40 text-xs">
					<div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
						<span>You can also toggle this at any time via Telegram:</span>
						<code className="px-1.5 py-0.5 rounded bg-background border border-border text-[11px] font-mono text-primary">
							/optout
						</code>
						<span>or</span>
						<code className="px-1.5 py-0.5 rounded bg-background border border-border text-[11px] font-mono text-primary">
							/optin
						</code>
					</div>
					<Button
						variant={isOptedOut ? "default" : "outline"}
						size="sm"
						disabled={isUpdating}
						onClick={() => onToggleOptOut?.(!isOptedOut)}
						className={`h-8 text-xs font-medium ${
							isOptedOut
								? "bg-emerald-600 hover:bg-emerald-500 text-white"
								: "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
						}`}
					>
						{isOptedOut ? "Opt Back In" : "Opt Out Fully"}
					</Button>
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
		return (
			<LoadingState
				icon={Activity}
				text="Loading telemetry & metrics..."
				iconClassName="w-8 h-8 animate-spin text-primary"
			/>
		);
	}

	const metricCards = getMetricCards(role, stats);

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			<BotPrivacyCard
				isOptedOut={isOptedOut}
				onToggleOptOut={onToggleOptOut}
				isUpdating={isUpdatingOptOut}
			/>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
				{metricCards.map((card) => (
					<MetricCard key={card.title} {...card} />
				))}
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
