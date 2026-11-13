import type { FC } from "react";
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
	includePersonalOption?: boolean;
	personalOptionLabel?: string;
	triggerClassName?: string;
}

export const ChatSelect: FC<ChatSelectProps> = ({
	id,
	value,
	onValueChange,
	chats,
	currentUser,
	placeholder = "Select destination...",
	includePersonalOption = false,
	personalOptionLabel,
	triggerClassName,
}) => {
	const currentUserIdStr = currentUser ? currentUser.id.toString() : null;
	const defaultPersonalLabel = currentUser
		? `${currentUser.first_name || "Me"} (you)`
		: "Personal";

	const filteredChats =
		includePersonalOption && currentUserIdStr
			? chats.filter((c) => c.chat_id !== currentUserIdStr)
			: chats;

	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger
				id={id}
				className={cn("w-full text-xs h-9", triggerClassName)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
				{includePersonalOption && currentUserIdStr && (
					<SelectItem value={currentUserIdStr} className="text-xs">
						<span className="truncate block max-w-[240px]">
							{personalOptionLabel || defaultPersonalLabel}
						</span>
					</SelectItem>
				)}

				{filteredChats.map((c) => (
					<SelectItem key={c.chat_id} value={c.chat_id} className="text-xs">
						<span
							dir="auto"
							className="truncate block max-w-[200px] sm:max-w-[280px]"
						>
							{getChatDisplayName(c)}
						</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
