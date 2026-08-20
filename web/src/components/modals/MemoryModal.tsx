import { Edit3, PlusCircle, Sparkles } from "lucide-react";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
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
	const [isSubmitting, setIsSubmitting] = useState(false);

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

		try {
			setIsSubmitting(true);
			if (isEdit && memory) {
				await apiFetch<{ success: boolean }>(`/api/memories/${memory.id}`, {
					method: "PATCH",
					body: JSON.stringify({ memoryText: trimmed, category }),
				});
				toast.success("Memory updated successfully!");
			} else {
				await apiFetch<{ success: boolean }>("/api/memories", {
					method: "POST",
					body: JSON.stringify({ chatId, memoryText: trimmed, category }),
				});
				toast.success("Fact remembered successfully!");
			}

			onOpenChange(false);
			onSuccess();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Failed to save memory";
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit} className="space-y-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-lg">
							{isEdit ? (
								<>
									<Edit3 className="w-5 h-5 text-primary" />
									<span>Edit Memory Record</span>
								</>
							) : (
								<>
									<PlusCircle className="w-5 h-5 text-primary" />
									<span>Record New Fact / Memory</span>
								</>
							)}
						</DialogTitle>
						<DialogDescription className="text-xs">
							{isEdit
								? "Update fact information. Embeddings will be refreshed automatically."
								: "Add persistent context to Gemini memory graph with semantic embeddings."}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-1">
						{!isEdit && (
							<div className="space-y-1.5">
								<label
									htmlFor="target-chat-select"
									className="text-xs font-semibold text-foreground"
								>
									Target Destination
								</label>
								<Select value={chatId} onValueChange={setChatId}>
									<SelectTrigger id="target-chat-select" className="w-full">
										<SelectValue placeholder="Select target..." />
									</SelectTrigger>
									<SelectContent>
										{currentUser && (
											<SelectItem value={currentUser.id.toString()}>
												Personal Profile (Me)
											</SelectItem>
										)}
										{availableChats
											.filter((c) => c.chat_id !== currentUser?.id.toString())
											.map((c) => (
												<SelectItem key={c.chat_id} value={c.chat_id}>
													{c.title || `Group ${c.chat_id}`}
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
								<SelectTrigger id="memory-category-select" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="PROFILE">
										<span className="font-medium text-blue-400">PROFILE</span> —
										Permanent Profile / Identity
									</SelectItem>
									<SelectItem value="DYNAMIC">
										<span className="font-medium text-emerald-400">
											DYNAMIC
										</span>{" "}
										— Preferences & State
									</SelectItem>
									<SelectItem value="TEMPORARY">
										<span className="font-medium text-amber-400">
											TEMPORARY
										</span>{" "}
										— Short-Lived Event / Context
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="memory-text-input"
								className="text-xs font-semibold text-foreground"
							>
								{isEdit ? "Memory Content" : "Memory Details"}
							</label>
							<Textarea
								id="memory-text-input"
								placeholder="e.g., User is a senior developer working with React..."
								value={memoryText}
								onChange={(e) => setMemoryText(e.target.value)}
								rows={4}
								className="resize-none"
							/>
						</div>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="flex items-center gap-2"
						>
							<Sparkles className="w-4 h-4" />
							<span>
								{isSubmitting
									? isEdit
										? "Updating..."
										: "Saving..."
									: isEdit
										? "Update Record"
										: "Save Memory"}
							</span>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
