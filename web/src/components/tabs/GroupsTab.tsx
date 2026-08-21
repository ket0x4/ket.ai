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
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Slider,
	Switch,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { getChatDisplayName } from "@/lib/utils";
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
			label: "Messages",
			value: chat.stats?.totalMessages ?? 0,
		},
		{
			icon: Users,
			label: "Members",
			value: chat.stats?.uniqueUsers ?? 0,
		},
		{
			icon: Brain,
			label: "Memories",
			value: chat.memoryCount ?? 0,
		},
	];

	return (
		<Card className="glass-card hover:border-primary/40 transition-all duration-200">
			<CardHeader className="p-4 pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<CardTitle className="text-sm font-semibold truncate text-foreground">
							{getChatDisplayName(chat)}
						</CardTitle>
						<span className="text-[11px] font-mono text-muted-foreground block truncate">
							ID: {chat.chat_id}
						</span>
					</div>

					{isOwner ? (
						<div className="flex items-center gap-2 bg-background/50 border border-border/50 px-2.5 py-1 rounded-full shrink-0">
							<span className="text-[11px] font-medium text-muted-foreground">
								Allowed
							</span>
							<Switch
								checked={chat.is_allowed}
								onCheckedChange={() =>
									onToggleAllowed(chat.chat_id, chat.is_allowed)
								}
							/>
						</div>
					) : chat.is_allowed ? (
						<Badge variant="success" className="text-[10px]">
							Allowed
						</Badge>
					) : (
						<Badge variant="destructive" className="text-[10px]">
							Inactive
						</Badge>
					)}
				</div>
			</CardHeader>

			<CardContent className="p-4 pt-2 space-y-3.5 text-xs">
				<div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-background/50 border border-border/40 text-center">
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
					<div className="space-y-1.5 pt-1">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-muted-foreground flex items-center gap-1">
								<Percent className="w-3 h-3" />
								<span>Random Reply Probability:</span>
							</span>
							<span className="font-mono font-bold text-primary">
								%{probability}
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
					<div className="text-[11px] text-muted-foreground flex items-center gap-1">
						<span>Reply Rate: </span>
						<span className="font-mono font-medium text-foreground">
							%{probability}
						</span>
					</div>
				)}
			</CardContent>
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
				title="Groups & Chat Permissions"
				description={
					role === "owner"
						? "Manage all Telegram groups the bot participates in, approval status, and reply probabilities."
						: "Review status and parameters of Telegram groups you manage."
				}
				actions={<RefreshButton onClick={onRefresh} isLoading={isLoading} />}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
				{isLoading && chats.length === 0 ? (
					<LoadingState
						icon={RefreshCw}
						text="Loading registered groups..."
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
						title="No registered groups found"
						description="Bot has not been added to any Telegram groups yet or no groups are registered."
						className="col-span-full py-16"
					/>
				)}
			</div>
		</div>
	);
};
