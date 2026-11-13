import { type FC, type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { CategorySelect, ChatSelect, ModalFooter } from "@/components/common";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Textarea,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { cleanMemoryText } from "@/lib/utils";
import type {
	Chat,
	Memory,
	MemoryCategory,
	TelegramUser,
	UserRole,
} from "@/types";

interface MemoryModalProps {
	mode: "add" | "edit";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memory?: Memory | null;
	currentUser: TelegramUser | null;
	chats?: Chat[];
	role?: UserRole;
	adminChatIds?: string[];
	memberChatIds?: string[];
	onSuccess: () => void;
}

export const MemoryModal: FC<MemoryModalProps> = ({
	mode,
	open,
	onOpenChange,
	memory,
	currentUser,
	chats = [],
	role = "user",
	adminChatIds = [],
	memberChatIds = [],
	onSuccess,
}) => {
	const isEdit = mode === "edit";
	const [chatId, setChatId] = useState<string>("");
	const [category, setCategory] = useState<MemoryCategory>("PROFILE");
	const [memoryText, setMemoryText] = useState("");
	const { isLoading: isSubmitting, execute } = useAsyncAction();

	useEffect(() => {
		if (isEdit && memory) {
			setCategory(memory.category || "PROFILE");
			setMemoryText(cleanMemoryText(memory.memory_text || ""));
		} else if (!isEdit) {
			setChatId(currentUser ? currentUser.id.toString() : "");
			setCategory("PROFILE");
			setMemoryText("");
		}
	}, [isEdit, memory, currentUser]);

	const availableChats = chats.filter((c) => {
		if (role === "owner") return true;
		if (adminChatIds.includes(c.chat_id)) return true;
		if (memberChatIds.includes(c.chat_id)) return true;
		return false;
	});

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const trimmed = memoryText.trim();
		if (!trimmed) {
			toast.error("Enter a fact.");
			return;
		}

		if (!isEdit && !chatId) {
			toast.error("Select a chat.");
			return;
		}

		await execute(
			async () => {
				if (isEdit && memory) {
					return api.memories.update(memory.id, {
						memoryText: trimmed,
						category,
					});
				}
				return api.memories.create({
					chatId,
					memoryText: trimmed,
					category,
				});
			},
			{
				successMessage: isEdit ? "Memory updated." : "Fact added.",
				errorMessage: "Failed to save memory",
				onSuccess: () => {
					onOpenChange(false);
					onSuccess();
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] w-[95vw] max-w-md overflow-y-auto sm:w-full">
				<form onSubmit={handleSubmit} className="space-y-4">
					<DialogHeader>
						<DialogTitle>{isEdit ? "Edit memory" : "Add memory"}</DialogTitle>
						<DialogDescription>
							{isEdit ? "Update this fact." : "Save a fact for this chat."}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						{!isEdit && (
							<div className="space-y-1.5">
								<label
									htmlFor="target-chat-select"
									className="text-xs text-muted-foreground"
								>
									Chat
								</label>
								<ChatSelect
									id="target-chat-select"
									value={chatId}
									onValueChange={setChatId}
									chats={availableChats}
									currentUser={currentUser}
									includePersonalOption={true}
									placeholder="Select chat"
								/>
							</div>
						)}

						<div className="space-y-1.5">
							<label
								htmlFor="memory-category-select"
								className="text-xs text-muted-foreground"
							>
								Type
							</label>
							<CategorySelect
								id="memory-category-select"
								value={category}
								onValueChange={(val) => setCategory(val as MemoryCategory)}
							/>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="memory-text-input"
								className="text-xs text-muted-foreground"
							>
								Fact
							</label>
							<Textarea
								id="memory-text-input"
								placeholder="e.g. Works as a senior engineer…"
								value={memoryText}
								onChange={(e) => setMemoryText(e.target.value)}
								rows={4}
								className="resize-none text-xs sm:text-sm"
							/>
						</div>
					</div>

					<ModalFooter
						onCancel={() => onOpenChange(false)}
						isSubmitting={isSubmitting}
						submitText={isEdit ? "Save" : "Add"}
						submittingText={isEdit ? "Saving" : "Adding"}
					/>
				</form>
			</DialogContent>
		</Dialog>
	);
};
