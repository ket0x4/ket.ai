import {
	Download,
	Edit2,
	Inbox,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Upload,
	User,
	Users,
} from "lucide-react";
import { type ChangeEvent, type FC, useMemo, useRef, useState } from "react";
import { CopyButton, EmptyState, LoadingState } from "@/components/common";
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
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { MEMORY_CATEGORIES, MEMORY_CATEGORY_LIST } from "@/lib/constants";
import {
	cleanMemoryText,
	formatDate,
	getChatDisplayName,
	normalizeSearchText,
} from "@/lib/utils";
import type { BaseTabProps, Memory, TelegramUser, UserRole } from "@/types";

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
	const isOwner = role === "owner";
	const isAdminOfChat = adminChatIds.includes(memory.chat_id);
	const isMyMemory = currentUser && memory.user_id === currentUser.id;
	const canEditDelete = isOwner || isAdminOfChat || isMyMemory;

	const catMeta =
		MEMORY_CATEGORIES[memory.category] || MEMORY_CATEGORIES.PROFILE;

	const userName = memory.user_first_name
		? `${memory.user_first_name}${memory.user_username ? ` (@${memory.user_username})` : ""}`
		: memory.user_username
			? `@${memory.user_username}`
			: null;

	const cleanedText = cleanMemoryText(memory.memory_text);

	return (
		<Card className="glass-card hover:border-primary/40 transition-all duration-200">
			<div className="p-3.5 sm:p-4 space-y-2.5">
				<div className="flex items-center justify-between gap-2 flex-wrap text-xs">
					<div className="flex items-center gap-1.5 flex-wrap min-w-0 max-w-full">
						<Badge variant={catMeta.badgeVariant} className="text-[10px]">
							{memory.category || "PROFILE"}
						</Badge>
						<span className="px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground text-[11px] font-medium truncate max-w-[200px] sm:max-w-[280px] flex items-center gap-1">
							<Users className="w-3 h-3 shrink-0" />
							<span className="truncate" dir="auto">
								{chatLabel}
							</span>
						</span>
						{userName && (
							<span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium truncate max-w-[160px] flex items-center gap-1">
								<User className="w-3 h-3 shrink-0" />
								<span className="truncate" dir="auto">
									{userName}
								</span>
							</span>
						)}
					</div>
					<span className="text-[11px] text-muted-foreground font-mono shrink-0">
						{formatDate(memory.created_at)}
					</span>
				</div>

				<p
					className="text-xs sm:text-sm text-foreground/90 leading-relaxed break-words font-sans"
					dir="auto"
				>
					{cleanedText}
				</p>

				<div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
					<CopyButton
						text={cleanedText}
						successMessage="Fact copied to clipboard!"
					/>

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

interface MemoriesTabProps extends BaseTabProps<Memory> {
	memories: Memory[];
}

function matchesScope(
	m: Memory,
	scope: string,
	user: TelegramUser | null,
): boolean {
	if (scope === "mine") {
		return Boolean(user && m.user_id === user.id);
	}
	if (scope === "group") {
		return !user || m.user_id !== user.id;
	}
	return true;
}

function matchesQuery(m: Memory, query: string): boolean {
	const trimmed = query.trim();
	if (!trimmed) return true;

	const normQ = normalizeSearchText(trimmed);
	const cleaned = cleanMemoryText(m.memory_text);
	const textMatch = normalizeSearchText(cleaned).includes(normQ);
	const rawMatch = normalizeSearchText(m.memory_text).includes(normQ);
	const catMatch = normalizeSearchText(m.category || "").includes(normQ);

	return textMatch || rawMatch || catMatch;
}

function matchesFilter(
	m: Memory,
	scope: string,
	chat: string,
	category: string,
	query: string,
	user: TelegramUser | null,
): boolean {
	if (!matchesScope(m, scope, user)) return false;
	if (chat !== "all" && m.chat_id !== chat) return false;
	if (category !== "all" && m.category !== category) return false;
	return matchesQuery(m, query);
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

	const { isLoading: isPruning, execute: executePrune } = useAsyncAction();
	const { execute: executeDelete } = useAsyncAction();
	const { execute: executeExport } = useAsyncAction();
	const { execute: executeImport } = useAsyncAction();

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

		await executeDelete(() => api.memories.delete(m.id), {
			successMessage: "Memory deleted.",
			errorMessage: "Delete failed",
			onSuccess: onRefresh,
		});
	};

	const handlePrune = async () => {
		if (!window.confirm("Prune all expired temporary memories now?")) return;

		await executePrune(
			() => api.memories.prune(chatFilter !== "all" ? chatFilter : undefined),
			{
				successMessage: (res) => `Pruned ${res.prunedCount} expired memories.`,
				errorMessage: "Prune failed",
				onSuccess: onRefresh,
			},
		);
	};

	const handleExport = async () => {
		await executeExport(
			async () => {
				const data = await api.memories.export();
				const blob = new Blob([JSON.stringify(data, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `ket_memories_${Date.now()}.json`;
				a.click();
				URL.revokeObjectURL(url);
			},
			{
				successMessage: "Export downloaded!",
				errorMessage: "Export failed",
			},
		);
	};

	const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		await executeImport(
			async () => {
				const text = await file.text();
				const parsed = JSON.parse(text);
				const list = Array.isArray(parsed) ? parsed : parsed.memories;

				if (!Array.isArray(list)) {
					throw new Error("Invalid format: expected memories array.");
				}

				return api.memories.import(list);
			},
			{
				successMessage: (res) =>
					`Imported ${res?.importedCount ?? 0} memory records!`,
				errorMessage: "Import failed",
				onSuccess: onRefresh,
			},
		);

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const getChatLabel = (m: Memory) => {
		if (
			m.chat_title &&
			m.chat_title !== "Whitelisted Chat" &&
			m.chat_title !== "Seeded Group"
		) {
			return m.chat_title;
		}
		if (currentUser && m.chat_id === currentUser.id.toString()) {
			return `Personal Profile (${currentUser.first_name || "Me"})`;
		}
		const found = chats.find((c) => c.chat_id === m.chat_id);
		return found
			? getChatDisplayName(found)
			: m.chat_id.startsWith("-")
				? `Group (${m.chat_id})`
				: `Chat (${m.chat_id})`;
	};

	return (
		<div className="space-y-4 animate-in fade-in duration-200">
			<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
				<div className="relative flex-1">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search facts and knowledge in memory..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 bg-card/60 text-xs sm:text-sm h-9"
					/>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						className="text-xs h-9 gap-1.5"
						title="Export memory graph as JSON"
					>
						<Download className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Export</span>
					</Button>

					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileChange}
						accept=".json"
						className="hidden"
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						className="text-xs h-9 gap-1.5"
						title="Import memory graph from JSON"
					>
						<Upload className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Import</span>
					</Button>

					{role !== "user" && (
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrune}
							disabled={isPruning}
							className="text-xs h-9 gap-1.5 text-amber-400 hover:text-amber-300"
							title="Prune expired memories"
						>
							<Trash2 className="w-3.5 h-3.5" />
							<span>{isPruning ? "Pruning..." : "Prune"}</span>
						</Button>
					)}

					<Button
						onClick={onOpenAddModal}
						size="sm"
						className="text-xs h-9 gap-1.5 shadow-sm shadow-primary/20"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Add Fact</span>
					</Button>
				</div>
			</div>

			{/* Filters */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<Select value={scopeFilter} onValueChange={setScopeFilter}>
					<SelectTrigger className="w-full bg-card/60 text-xs h-9">
						<SelectValue placeholder="Scope" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all" className="text-xs">
							All Scopes
						</SelectItem>
						<SelectItem value="mine" className="text-xs">
							My Memories
						</SelectItem>
						<SelectItem value="group" className="text-xs">
							Group Memories
						</SelectItem>
					</SelectContent>
				</Select>

				<Select value={chatFilter} onValueChange={setChatFilter}>
					<SelectTrigger className="w-full bg-card/60 text-xs h-9">
						<SelectValue placeholder="All Groups" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all" className="text-xs">
							All Groups & Chats
						</SelectItem>
						{chats.map((c) => (
							<SelectItem key={c.chat_id} value={c.chat_id} className="text-xs">
								<span dir="auto" className="truncate block max-w-[260px]">
									{getChatDisplayName(c)}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="w-full bg-card/60 text-xs h-9">
						<SelectValue placeholder="All Categories" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all" className="text-xs">
							All Categories
						</SelectItem>
						{MEMORY_CATEGORY_LIST.map((cat) => (
							<SelectItem key={cat.value} value={cat.value} className="text-xs">
								{cat.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-3 pt-2">
				{isLoading && memories.length === 0 ? (
					<LoadingState
						icon={Sparkles}
						text="Loading memory records..."
						iconClassName="w-6 h-6 animate-pulse text-primary"
					/>
				) : filteredMemories.length > 0 ? (
					filteredMemories.map((m) => (
						<MemoryCard
							key={m.id}
							memory={m}
							role={role}
							adminChatIds={adminChatIds}
							currentUser={currentUser}
							chatLabel={getChatLabel(m)}
							onEdit={onOpenEditModal}
							onDelete={handleDelete}
						/>
					))
				) : (
					<EmptyState
						icon={Inbox}
						title="No memory records found"
						description="No saved memories matched your filters. You can add a new fact to get started."
						action={
							<Button size="sm" onClick={onOpenAddModal} className="text-xs">
								<Plus className="w-3.5 h-3.5 mr-1" />
								Add First Fact
							</Button>
						}
					/>
				)}
			</div>
		</div>
	);
};
