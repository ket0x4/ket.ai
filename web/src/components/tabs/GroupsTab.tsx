import { Users } from "lucide-react";
import { type FC, useState } from "react";
import {
	EmptyState,
	LoadingState,
	PageHeader,
	RefreshButton,
} from "@/components/common";
import { Card, Slider, Switch } from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { cn, formatCount, getChatDisplayName } from "@/lib/utils";
import type { Chat, UserRole } from "@/types";

interface GroupCardProps {
	chat: Chat;
	role: UserRole;
	onToggleAllowed: (chatId: string, currentAllowed: boolean) => Promise<void>;
}

interface GroupSpontaneousControlsProps {
	probability: number;
	spontaneousEnabled: boolean;
	onToggleSpontaneous: (checked: boolean) => void;
	onProbabilityChange: (val: number) => void;
	onProbabilityCommit: (val: number[]) => void;
}

const GroupSpontaneousControls: FC<GroupSpontaneousControlsProps> = ({
	probability,
	spontaneousEnabled,
	onToggleSpontaneous,
	onProbabilityChange,
	onProbabilityCommit,
}) => (
	<div className="mt-3 space-y-2 border-t border-border/60 pt-3">
		<div className="flex items-center justify-between gap-3">
			<span className="text-xs text-muted-foreground">Auto-reply</span>
			<div className="flex items-center gap-2">
				<span className="font-mono text-[11px] text-foreground tnum">
					{spontaneousEnabled ? `${probability}%` : "Off"}
				</span>
				<Switch
					checked={spontaneousEnabled}
					onCheckedChange={onToggleSpontaneous}
					aria-label="Auto-reply"
				/>
			</div>
		</div>

		{spontaneousEnabled && (
			<Slider
				value={[probability]}
				min={0}
				max={100}
				step={1}
				onValueChange={(val) => onProbabilityChange(val[0])}
				onValueCommit={onProbabilityCommit}
				aria-label="Reply probability"
			/>
		)}
	</div>
);

const GroupAccessControl: FC<{
	chat: Chat;
	isOwner: boolean;
	onToggleAllowed: (chatId: string, currentAllowed: boolean) => Promise<void>;
}> = ({ chat, isOwner, onToggleAllowed }) => {
	if (isOwner) {
		return (
			<div className="flex shrink-0 items-center gap-2">
				<span className="text-[11px] text-muted-foreground">
					{chat.is_allowed ? "Allowed" : "Blocked"}
				</span>
				<Switch
					checked={chat.is_allowed}
					onCheckedChange={() => onToggleAllowed(chat.chat_id, chat.is_allowed)}
					aria-label="Allow bot in this group"
				/>
			</div>
		);
	}
	return (
		<span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
			<span
				className={cn(
					"h-1.5 w-1.5 rounded-full",
					chat.is_allowed ? "bg-emerald-500" : "bg-muted-foreground",
				)}
			/>
			{chat.is_allowed ? "Allowed" : "Inactive"}
		</span>
	);
};

const GroupCard: FC<GroupCardProps> = ({ chat, role, onToggleAllowed }) => {
	const isOwner = role === "owner";
	const isAdmin = chat.isAdmin || isOwner;
	const initialProb = Math.round((chat.reply_probability ?? 0.05) * 100);
	const [probability, setProbability] = useState<number>(initialProb);
	const [spontaneousEnabled, setSpontaneousEnabled] = useState<boolean>(
		chat.spontaneous_enabled ?? initialProb > 0,
	);
	const { execute } = useAsyncAction();

	const handleToggleSpontaneous = async (checked: boolean) => {
		const shouldRestoreDefault = checked && probability === 0;
		setSpontaneousEnabled(checked);
		if (shouldRestoreDefault) {
			setProbability(5);
		}
		await execute(
			() =>
				api.chats.update(chat.chat_id, {
					spontaneous_enabled: checked,
					...(shouldRestoreDefault ? { reply_probability: 0.05 } : {}),
				}),
			{
				successMessage: checked ? "Auto-reply on." : "Auto-reply off.",
				errorMessage: "Update failed",
			},
		);
	};

	const handleProbabilityCommit = async (val: number[]) => {
		const probVal = val[0] / 100;
		const nextEnabled = val[0] > 0;
		setSpontaneousEnabled(nextEnabled);
		await execute(
			() =>
				api.chats.update(chat.chat_id, {
					reply_probability: probVal,
					spontaneous_enabled: nextEnabled,
				}),
			{
				successMessage: `Reply rate ${val[0]}%.`,
				errorMessage: "Update failed",
			},
		);
	};

	return (
		<Card className="p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="truncate text-sm font-medium" dir="auto">
						{getChatDisplayName(chat)}
					</div>
					<div className="truncate font-mono text-[10px] text-muted-foreground">
						{chat.chat_id}
					</div>
				</div>

				<GroupAccessControl
					chat={chat}
					isOwner={isOwner}
					onToggleAllowed={onToggleAllowed}
				/>
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
				<span>
					<span className="font-mono text-foreground tnum">
						{formatCount(chat.stats?.totalMessages ?? 0)}
					</span>{" "}
					msgs
				</span>
				<span>
					<span className="font-mono text-foreground tnum">
						{formatCount(chat.stats?.uniqueUsers ?? 0)}
					</span>{" "}
					members
				</span>
				<span>
					<span className="font-mono text-foreground tnum">
						{formatCount(chat.memoryCount ?? 0)}
					</span>{" "}
					facts
				</span>
			</div>

			{isAdmin ? (
				<GroupSpontaneousControls
					probability={probability}
					spontaneousEnabled={spontaneousEnabled}
					onToggleSpontaneous={handleToggleSpontaneous}
					onProbabilityChange={setProbability}
					onProbabilityCommit={handleProbabilityCommit}
				/>
			) : (
				<div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px]">
					<span className="text-muted-foreground">Auto-reply</span>
					<span className="font-mono text-foreground tnum">
						{spontaneousEnabled ? `${probability}%` : "Off"}
					</span>
				</div>
			)}
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
			successMessage: nextAllowed ? "Group approved." : "Group blocked.",
			errorMessage: "Update failed",
			onSuccess: onRefresh,
		});
	};

	return (
		<div className="space-y-4">
			<PageHeader
				title="Groups"
				actions={
					<RefreshButton
						onClick={onRefresh}
						isLoading={isLoading}
						variant="ghost"
						size="icon"
						label=""
					/>
				}
			/>

			<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
				{isLoading && chats.length === 0 ? (
					<LoadingState className="col-span-full" />
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
						icon={Users}
						title="No groups"
						description="Add the bot to a group to see it here."
						className="col-span-full"
					/>
				)}
			</div>
		</div>
	);
};
