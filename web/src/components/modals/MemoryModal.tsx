import { Edit3, PlusCircle } from "lucide-react";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { ModalFooter } from "@/components/common";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { MEMORY_CATEGORY_LIST } from "@/lib/constants";
import { getChatDisplayName } from "@/lib/utils";
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
			setMemoryText(memory.memory_text || "");
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
			toast.error("Please enter memory content.");
			return;
		}

		if (!isEdit && !chatId) {
			toast.error("Please select a target destination.");
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
				successMessage: isEdit
					? "Memory updated successfully!"
					: "Fact remembered successfully!",
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
			<DialogContent className="max-w-md w-[95vw] sm:w-full bg-card border-border shadow-2xl p-5 sm:p-6 rounded-2xl max-h-[85dvh] overflow-y-auto">
				<form onSubmit={handleSubmit} className="space-y-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-lg font-bold">
							{isEdit ? (
								<>
									<Edit3 className="w-5 h-5 text-primary" />
									<span>Edit Memory Record</span>
								</>
							) : (
								<>
									<PlusCircle className="w-5 h-5 text-primary" />
									<span>Add New Memory Fact</span>
								</>
							)}
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							{isEdit
								? "Update the memory fact. Vector embeddings will be recomputed automatically."
								: "Add persistent contextual knowledge to the Gemini memory graph."}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-1">
						{!isEdit && (
							<div className="space-y-1.5">
								<label
									htmlFor="target-chat-select"
									className="text-xs font-semibold text-foreground"
								>
									Target Chat / Group
								</label>
								<Select value={chatId} onValueChange={setChatId}>
									<SelectTrigger
										id="target-chat-select"
										className="w-full text-xs"
									>
										<SelectValue placeholder="Select destination..." />
									</SelectTrigger>
									<SelectContent>
										{currentUser && (
											<SelectItem
												value={currentUser.id.toString()}
												className="text-xs"
											>
												Personal Profile ({currentUser.first_name || "Me"})
											</SelectItem>
										)}
										{availableChats
											.filter((c) => c.chat_id !== currentUser?.id.toString())
											.map((c) => (
												<SelectItem
													key={c.chat_id}
													value={c.chat_id}
													className="text-xs"
												>
													{getChatDisplayName(c)}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="space-y-1.5">
							<label
								htmlFor="memory-category-select"
								className="text-xs font-semibold text-foreground"
							>
								Category
							</label>
							<Select
								value={category}
								onValueChange={(val) => setCategory(val as MemoryCategory)}
							>
								<SelectTrigger
									id="memory-category-select"
									className="w-full text-xs"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MEMORY_CATEGORY_LIST.map((cat) => (
										<SelectItem
											key={cat.value}
											value={cat.value}
											className="text-xs"
										>
											<span className={`font-medium ${cat.textColor}`}>
												{cat.label}
											</span>{" "}
											— {cat.description}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="memory-text-input"
								className="text-xs font-semibold text-foreground"
							>
								{isEdit ? "Memory Content" : "Fact Details"}
							</label>
							<Textarea
								id="memory-text-input"
								placeholder="e.g. User is a senior engineer working with Python and React..."
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
						submitText={isEdit ? "Update Record" : "Save Fact"}
						submittingText={isEdit ? "Updating..." : "Saving..."}
					/>
				</form>
			</DialogContent>
		</Dialog>
	);
};
