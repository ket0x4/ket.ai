import {
	Brain,
	MessageSquare,
	Percent,
	RefreshCw,
	ShieldAlert,
	Users,
} from "lucide-react";
import { type FC, useState } from "react";
import {
	EmptyState,
	LoadingState,
	RefreshButton,
	SectionHeader,
	StatBox,
} from "@/components/common";
import { Card, Slider, Switch } from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { cn, getChatDisplayName } from "@/lib/utils";
import type { Chat, UserRole } from "@/types";

interface GroupCardProps {
	chat: Chat;
	role: UserRole;
	onToggleAllowed: (chatId: string, currentAllowed: boolean) => Promise<void>;
}

const GroupCard: FC<GroupCardProps> = ({ chat, role, onToggleAllowed }) => {
	const isOwner = role === "owner";
	const isAdmin = chat.isAdmin || isOwner;
	const initialProb = Math.round((chat.reply_probability ?? 0.05) * 100);
	const [probability, setProbability] = useState<number>(initialProb);
	const { execute } = useAsyncAction();

	const handleProbabilityCommit = async (val: number[]) => {
		const probVal = val[0] / 100;
		await execute(
			() => api.chats.update(chat.chat_id, { reply_probability: probVal }),
			{
				successMessage: `Reply probability updated to ${val[0]}%.`,
				errorMessage: "Update failed",
			},
		);
	};

	const groupStats = [
		{
			icon: MessageSquare,
			label: "Msgs",
			value: chat.stats?.totalMessages ?? 0,
		},
		{ icon: Users, label: "Members", value: chat.stats?.uniqueUsers ?? 0 },
		{ icon: Brain, label: "Memories", value: chat.memoryCount ?? 0 },
	];

	return (
		<Card>
			<div className="flex items-start justify-between gap-3 p-4">
				<div className="min-w-0">
					<div className="truncate text-sm font-medium" dir="auto">
						{getChatDisplayName(chat)}
					</div>
					<div className="truncate font-mono text-[11px] text-muted-foreground">
						{chat.chat_id}
					</div>
				</div>

				{isOwner ? (
					<div className="flex shrink-0 items-center gap-2">
						<span className="text-[11px] text-muted-foreground">
							{chat.is_allowed ? "Allowed" : "Blocked"}
						</span>
						<Switch
							checked={chat.is_allowed}
							onCheckedChange={() =>
								onToggleAllowed(chat.chat_id, chat.is_allowed)
							}
						/>
					</div>
				) : (
					<span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
						<span
							className={cn(
								"h-1.5 w-1.5 rounded-full",
								chat.is_allowed ? "bg-emerald-500" : "bg-muted-foreground",
							)}
						/>
						{chat.is_allowed ? "Allowed" : "Inactive"}
					</span>
				)}
			</div>

			<div className="space-y-3 border-t border-border/60 p-4">
				<div className="grid grid-cols-3 gap-1 rounded-lg border border-border/60 bg-background/40 py-2.5">
					{groupStats.map((stat) => (
						<StatBox
							key={stat.label}
							icon={stat.icon}
							label={stat.label}
							value={stat.value}
							layout="vertical"
						/>
					))}
				</div>

				{isAdmin ? (
					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs">
							<span className="flex items-center gap-1 text-muted-foreground">
								<Percent className="h-3 w-3" />
								Reply probability
							</span>
							<span className="font-mono font-medium text-foreground tnum">
								{probability}%
							</span>
						</div>
						<Slider
							value={[probability]}
							min={0}
							max={100}
							step={1}
							onValueChange={(val) => setProbability(val[0])}
							onValueCommit={handleProbabilityCommit}
						/>
					</div>
				) : (
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>Reply rate</span>
						<span className="font-mono text-foreground tnum">
							{probability}%
						</span>
					</div>
				)}
			</div>
		</Card>
	);
};

interface GroupsTabProps {
	chats: Chat[];
	role: UserRole;
	isLoading: boolean;
	onRefresh: () => void;
}

export const GroupsTab: FC<GroupsTabProps> = ({
	chats,
	role,
	isLoading,
	onRefresh,
}) => {
	const { execute } = useAsyncAction();

	const handleToggleAllowed = async (
		chatId: string,
		currentAllowed: boolean,
	) => {
		const nextAllowed = !currentAllowed;
		await execute(() => api.chats.update(chatId, { is_allowed: nextAllowed }), {
			successMessage: nextAllowed
				? "Group approved for bot usage!"
				: "Group approval revoked.",
			errorMessage: "Update failed",
			onSuccess: onRefresh,
		});
	};

	return (
		<div className="space-y-4 animate-in fade-in duration-200">
			<SectionHeader
				icon={Users}
				title="Groups"
				description={
					role === "owner"
						? "Approval status and reply behavior per group."
						: "Groups you manage."
				}
				actions={<RefreshButton onClick={onRefresh} isLoading={isLoading} />}
			/>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{isLoading && chats.length === 0 ? (
					<LoadingState
						icon={RefreshCw}
						text="Loading groups…"
						className="col-span-full py-16"
					/>
				) : chats.length > 0 ? (
					chats.map((c) => (
						<GroupCard
							key={c.chat_id}
							chat={c}
							role={role}
							onToggleAllowed={handleToggleAllowed}
						/>
					))
				) : (
					<EmptyState
						icon={ShieldAlert}
						title="No groups yet"
						description="Groups appear here once the bot is added to them."
						className="col-span-full py-16"
					/>
				)}
			</div>
		</div>
	);
};
