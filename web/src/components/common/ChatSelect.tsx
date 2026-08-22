import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn, getChatDisplayName } from "@/lib/utils";
import type { Chat, TelegramUser } from "@/types";

export interface ChatSelectProps {
	id?: string;
	value: string;
	onValueChange: (value: string) => void;
	chats: Chat[];
	currentUser?: TelegramUser | null;
	placeholder?: string;
	includeAllOption?: boolean;
	allOptionLabel?: string;
	includePersonalOption?: boolean;
	personalOptionLabel?: string;
	showMemoryCount?: boolean;
	disabled?: boolean;
	className?: string;
	triggerClassName?: string;
	contentClassName?: string;
}

export const ChatSelect: FC<ChatSelectProps> = ({
	id,
	value,
	onValueChange,
	chats,
	currentUser,
	placeholder = "Select destination...",
	includeAllOption = false,
	allOptionLabel = "All Groups & Chats",
	includePersonalOption = false,
	personalOptionLabel,
	showMemoryCount = false,
	disabled = false,
	triggerClassName,
	contentClassName,
}) => {
	const currentUserIdStr = currentUser ? currentUser.id.toString() : null;
	const defaultPersonalLabel = currentUser
		? `Personal Profile (${currentUser.first_name || "Me"})`
		: "Personal Profile";

	const filteredChats =
		includePersonalOption && currentUserIdStr
			? chats.filter((c) => c.chat_id !== currentUserIdStr)
			: chats;

	return (
		<Select value={value} onValueChange={onValueChange} disabled={disabled}>
			<SelectTrigger
				id={id}
				className={cn("w-full text-xs h-9 bg-card/60", triggerClassName)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent
				className={cn("max-w-[calc(100vw-2rem)] sm:max-w-md", contentClassName)}
			>
				{includeAllOption && (
					<SelectItem value="all" className="text-xs">
						{allOptionLabel}
					</SelectItem>
				)}

				{includePersonalOption && currentUserIdStr && (
					<SelectItem value={currentUserIdStr} className="text-xs">
						<span className="truncate block max-w-[240px]">
							{personalOptionLabel || defaultPersonalLabel}
						</span>
					</SelectItem>
				)}

				{filteredChats.map((c) => (
					<SelectItem key={c.chat_id} value={c.chat_id} className="text-xs">
						<div className="flex items-center justify-between gap-2 min-w-0">
							<span
								dir="auto"
								className="truncate block max-w-[200px] sm:max-w-[280px]"
							>
								{getChatDisplayName(c)}
							</span>
							{showMemoryCount && (
								<Badge
									variant="outline"
									className="text-[10px] font-mono px-1.5 py-0 h-4 bg-secondary/60 shrink-0 ml-1"
								>
									{c.memoryCount ?? 0} mems
								</Badge>
							)}
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
