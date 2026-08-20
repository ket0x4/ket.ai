import {
	Brain,
	MessageSquare,
	Percent,
	RefreshCw,
	ShieldAlert,
	Users,
} from "lucide-react";
import { type FC, useState } from "react";
import { toast } from "sonner";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Slider,
	Switch,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
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

	const handleProbabilityCommit = async (val: number[]) => {
		const probVal = val[0] / 100;
		try {
			await apiFetch<{ success: boolean }>(`/api/chats/${chat.chat_id}`, {
				method: "PATCH",
				body: JSON.stringify({ reply_probability: probVal }),
			});
			toast.success(`Reply probability updated to ${val[0]}%.`);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Update failed";
			toast.error(msg);
		}
	};

	return (
		<Card className="glass-card hover:border-primary/40 transition-all duration-200">
			<CardHeader className="p-4 pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<CardTitle className="text-sm font-semibold truncate text-foreground">
							{chat.title || `Group ${chat.chat_id}`}
						</CardTitle>
						<span className="text-[11px] font-mono text-muted-foreground block">
							{chat.chat_id}
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
					<div>
						<div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
							<MessageSquare className="w-3 h-3" />
							<span>Msgs</span>
						</div>
						<div className="font-semibold font-mono text-foreground mt-0.5">
							{chat.stats?.totalMessages ?? 0}
						</div>
					</div>

					<div>
						<div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
							<Users className="w-3 h-3" />
							<span>Users</span>
						</div>
						<div className="font-semibold font-mono text-foreground mt-0.5">
							{chat.stats?.uniqueUsers ?? 0}
						</div>
					</div>

					<div>
						<div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
							<Brain className="w-3 h-3" />
							<span>Facts</span>
						</div>
						<div className="font-semibold font-mono text-foreground mt-0.5">
							{chat.memoryCount ?? 0}
						</div>
					</div>
				</div>

				{isAdmin ? (
					<div className="space-y-1.5 pt-1">
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-muted-foreground flex items-center gap-1">
								<Percent className="w-3 h-3" />
								<span>Reply Likelihood:</span>
							</span>
							<span className="font-mono font-bold text-primary">
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
					<div className="text-[11px] text-muted-foreground flex items-center gap-1">
						<span>Reply Rate: </span>
						<span className="font-mono font-medium text-foreground">
							{probability}%
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
	const handleToggleAllowed = async (
		chatId: string,
		currentAllowed: boolean,
	) => {
		const nextAllowed = !currentAllowed;
		try {
			await apiFetch<{ success: boolean }>(`/api/chats/${chatId}`, {
				method: "PATCH",
				body: JSON.stringify({ is_allowed: nextAllowed }),
			});
			toast.success(
				nextAllowed ? "Group whitelisted!" : "Group removed from whitelist.",
			);
			onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Update failed";
			toast.error(msg);
		}
	};

	return (
		<div className="space-y-4 animate-in fade-in duration-200">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
						<Users className="w-5 h-5 text-primary" />
						<span>Groups & Channel Permissions</span>
					</h3>
					<p className="text-xs text-muted-foreground">
						{role === "owner"
							? "Manage bot whitelist permissions and random reply probabilities across all channels."
							: "Overview and manage parameters for your assigned Telegram groups."}
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={onRefresh}
					className="h-8 text-xs flex items-center gap-1.5"
				>
					<RefreshCw className="w-3.5 h-3.5" />
					<span>Refresh</span>
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
				{isLoading && chats.length === 0 ? (
					<div className="col-span-full py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
						<RefreshCw className="w-6 h-6 animate-spin text-primary" />
						<span>Loading registered groups...</span>
					</div>
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
					<div className="col-span-full py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 rounded-2xl bg-card/30">
						<ShieldAlert className="w-8 h-8 opacity-40" />
						<div className="text-sm font-medium text-foreground">
							No groups registered
						</div>
						<p className="text-xs text-muted-foreground max-w-sm">
							The bot has not been added to any Telegram groups yet. Add the bot
							to your group to manage it here.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};
