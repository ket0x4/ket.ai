import {
	Check,
	Copy,
	Download,
	Edit2,
	Inbox,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Upload,
} from "lucide-react";
import { type ChangeEvent, type FC, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type {
	Chat,
	Memory,
	MemoryCategory,
	TelegramUser,
	UserRole,
} from "@/types";

function getCategoryBadgeVariant(cat: MemoryCategory) {
	switch (cat) {
		case "PROFILE":
			return "profile";
		case "DYNAMIC":
			return "dynamic";
		case "TEMPORARY":
			return "temporary";
		default:
			return "default";
	}
}

interface MemoryCardProps {
	memory: Memory;
	role: UserRole;
	adminChatIds: string[];
	currentUser: TelegramUser | null;
	chatLabel: string;
	onEdit: (m: Memory) => void;
	onDelete: (m: Memory) => void;
}

const MemoryCard: FC<MemoryCardProps> = ({
	memory,
	role,
	adminChatIds,
	currentUser,
	chatLabel,
	onEdit,
	onDelete,
}) => {
	const [copied, setCopied] = useState(false);

	const isOwner = role === "owner";
	const isAdminOfChat = adminChatIds.includes(memory.chat_id);
	const isMyMemory = currentUser && memory.user_id === currentUser.id;
	const canEditDelete = isOwner || isAdminOfChat || isMyMemory;

	const handleCopy = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(memory.memory_text);
			setCopied(true);
			toast.success("Fact copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<Card className="glass-card hover:border-primary/40 transition-all duration-200">
			<div className="p-4 sm:p-5 space-y-3">
				<div className="flex items-center justify-between gap-2 flex-wrap text-xs">
					<div className="flex items-center gap-2 flex-wrap">
						<Badge variant={getCategoryBadgeVariant(memory.category)}>
							{memory.category || "PROFILE"}
						</Badge>
						<span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[11px] font-medium truncate max-w-[200px]">
							{chatLabel}
						</span>
					</div>
					<span className="text-[11px] text-muted-foreground font-mono">
						{formatDate(memory.created_at)}
					</span>
				</div>

				<p className="text-xs sm:text-sm text-foreground leading-relaxed break-words font-sans">
					{memory.memory_text}
				</p>

				<div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopy}
						className="h-7 px-2 text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
					>
						{copied ? (
							<>
								<Check className="w-3.5 h-3.5 text-emerald-400" />
								<span className="text-emerald-400">Copied</span>
							</>
						) : (
							<>
								<Copy className="w-3.5 h-3.5" />
								<span>Copy</span>
							</>
						)}
					</Button>

					{canEditDelete && (
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onEdit(memory)}
								className="h-7 px-2 text-muted-foreground hover:text-blue-400 flex items-center gap-1 text-xs"
							>
								<Edit2 className="w-3.5 h-3.5" />
								<span>Edit</span>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onDelete(memory)}
								className="h-7 px-2 text-muted-foreground hover:text-destructive flex items-center gap-1 text-xs"
							>
								<Trash2 className="w-3.5 h-3.5" />
								<span>Delete</span>
							</Button>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
};

interface MemoriesTabProps {
	memories: Memory[];
	chats: Chat[];
	currentUser: TelegramUser | null;
	role: UserRole;
	adminChatIds: string[];
	isLoading: boolean;
	onOpenAddModal: () => void;
	onOpenEditModal: (m: Memory) => void;
	onRefresh: () => void;
}

function matchesFilter(
	m: Memory,
	scope: string,
	chat: string,
	category: string,
	query: string,
	user: TelegramUser | null,
): boolean {
	if (scope === "mine" && user && m.user_id && m.user_id !== user.id) {
		return false;
	}
	if (chat !== "all" && m.chat_id !== chat) {
		return false;
	}
	if (category !== "all" && m.category !== category) {
		return false;
	}
	if (query.trim()) {
		const q = query.toLowerCase();
		const textMatch = m.memory_text.toLowerCase().includes(q);
		const catMatch = m.category?.toLowerCase().includes(q);
		if (!textMatch && !catMatch) return false;
	}
	return true;
}

export const MemoriesTab: FC<MemoriesTabProps> = ({
	memories,
	chats,
	currentUser,
	role,
	adminChatIds,
	isLoading,
	onOpenAddModal,
	onOpenEditModal,
	onRefresh,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [scopeFilter, setScopeFilter] = useState<string>("mine");
	const [chatFilter, setChatFilter] = useState<string>("all");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [isPruning, setIsPruning] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const filteredMemories = useMemo(() => {
		return memories.filter((m) =>
			matchesFilter(
				m,
				scopeFilter,
				chatFilter,
				categoryFilter,
				searchQuery,
				currentUser,
			),
		);
	}, [
		memories,
		scopeFilter,
		chatFilter,
		categoryFilter,
		searchQuery,
		currentUser,
	]);

	const handleDelete = async (m: Memory) => {
		if (
			!window.confirm(
				"Are you sure you want to permanently delete this memory?",
			)
		) {
			return;
		}

		try {
			await apiFetch<{ success: boolean }>(`/api/memories/${m.id}`, {
				method: "DELETE",
			});
			toast.success("Memory deleted.");
			onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Delete failed";
			toast.error(msg);
		}
	};

	const handlePrune = async () => {
		if (!window.confirm("Prune all expired temporary memories now?")) return;

		try {
			setIsPruning(true);
			const res = await apiFetch<{ prunedCount: number }>(
				"/api/memories/prune",
				{
					method: "POST",
					body: JSON.stringify(
						chatFilter !== "all" ? { chatId: chatFilter } : {},
					),
				},
			);
			toast.success(`Pruned ${res.prunedCount} expired memories.`);
			onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Prune failed";
			toast.error(msg);
		} finally {
			setIsPruning(false);
		}
	};

	const handleExport = async () => {
		try {
			const data = await apiFetch<unknown>("/api/memories/export");
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `ket_memories_${Date.now()}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Export downloaded!");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Export failed";
			toast.error(msg);
		}
	};

	const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			const list = Array.isArray(parsed) ? parsed : parsed.memories;

			if (!Array.isArray(list)) {
				throw new Error("Invalid format: expected memories array.");
			}

			const res = await apiFetch<{ importedCount: number }>(
				"/api/memories/import",
				{
					method: "POST",
					body: JSON.stringify({ memories: list }),
				},
			);

			toast.success(`Imported ${res.importedCount} memory records!`);
			onRefresh();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Import failed";
			toast.error(msg);
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const getChatLabel = (chatId: string) => {
		if (currentUser && chatId === currentUser.id.toString()) {
			return "Personal Profile";
		}
		const found = chats.find((c) => c.chat_id === chatId);
		return found?.title || `Chat ${chatId}`;
	};

	return (
		<div className="space-y-4 animate-in fade-in duration-200">
			<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
				<div className="relative flex-1">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search semantic memories & facts..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 bg-card/60"
					/>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{role !== "user" && (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={handleExport}
								className="flex items-center gap-1.5 text-xs h-9"
							>
								<Download className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">Export</span>
							</Button>

							<Button
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								className="flex items-center gap-1.5 text-xs h-9"
							>
								<Upload className="w-3.5 h-3.5" />
								<span className="hidden sm:inline">Import</span>
							</Button>
							<input
								type="file"
								ref={fileInputRef}
								accept=".json"
								className="hidden"
								onChange={handleFileChange}
							/>

							<Button
								variant="outline"
								size="sm"
								onClick={handlePrune}
								disabled={isPruning}
								className="flex items-center gap-1.5 text-xs h-9 text-amber-400 hover:text-amber-300"
							>
								<Trash2 className="w-3.5 h-3.5" />
								<span>{isPruning ? "Pruning..." : "Prune"}</span>
							</Button>
						</>
					)}

					<Button
						size="sm"
						onClick={onOpenAddModal}
						className="flex items-center gap-1.5 text-xs h-9 shadow-md shadow-primary/20"
					>
						<Plus className="w-4 h-4" />
						<span>New Fact</span>
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<Select value={scopeFilter} onValueChange={setScopeFilter}>
					<SelectTrigger className="w-full bg-card/60">
						<SelectValue placeholder="Scope" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="mine">My Personal Facts</SelectItem>
						<SelectItem value="all">All Accessible Memories</SelectItem>
					</SelectContent>
				</Select>

				<Select value={chatFilter} onValueChange={setChatFilter}>
					<SelectTrigger className="w-full bg-card/60">
						<SelectValue placeholder="All Groups" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Groups / Contexts</SelectItem>
						{chats.map((c) => (
							<SelectItem key={c.chat_id} value={c.chat_id}>
								{c.title || `Chat ${c.chat_id}`}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="w-full bg-card/60">
						<SelectValue placeholder="All Categories" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Categories</SelectItem>
						<SelectItem value="PROFILE">PROFILE</SelectItem>
						<SelectItem value="DYNAMIC">DYNAMIC</SelectItem>
						<SelectItem value="TEMPORARY">TEMPORARY</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-3 pt-2">
				{isLoading && memories.length === 0 ? (
					<div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
						<Sparkles className="w-6 h-6 animate-pulse text-primary" />
						<span className="text-xs">Loading semantic facts...</span>
					</div>
				) : filteredMemories.length > 0 ? (
					filteredMemories.map((m) => (
						<MemoryCard
							key={m.id}
							memory={m}
							role={role}
							adminChatIds={adminChatIds}
							currentUser={currentUser}
							chatLabel={getChatLabel(m.chat_id)}
							onEdit={onOpenEditModal}
							onDelete={handleDelete}
						/>
					))
				) : (
					<div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 rounded-2xl bg-card/30">
						<Inbox className="w-8 h-8 opacity-40" />
						<div className="text-sm font-medium text-foreground">
							No memory records found
						</div>
						<p className="text-xs text-muted-foreground max-w-sm">
							No facts match your search filters. You can record a new fact
							anytime.
						</p>
						<Button size="sm" onClick={onOpenAddModal} className="mt-2 text-xs">
							<Plus className="w-3.5 h-3.5 mr-1" />
							Add First Fact
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
