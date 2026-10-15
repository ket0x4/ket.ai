import {
	Download,
	Edit2,
	Inbox,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import { type ChangeEvent, type FC, useMemo, useRef, useState } from "react";
import {
	CategoryBadge,
	CategorySelect,
	ChatSelect,
	CopyButton,
	EmptyState,
	LoadingState,
	SearchInput,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
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

	const userName = memory.user_first_name
		? `${memory.user_first_name}${memory.user_username ? ` (@${memory.user_username})` : ""}`
		: memory.user_username
			? `@${memory.user_username}`
			: null;

	const cleanedText = cleanMemoryText(memory.memory_text);

	return (
		<Card>
			<div className="space-y-3 p-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
						<CategoryBadge category={memory.category} />
						<span className="truncate" dir="auto">
							{chatLabel}
						</span>
						{userName && (
							<>
								<span className="text-border">·</span>
								<span className="truncate" dir="auto">
									{userName}
								</span>
							</>
						)}
					</div>
					<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
						{formatDate(memory.created_at)}
					</span>
				</div>

				<p
					className="break-words text-xs leading-relaxed text-foreground/90 sm:text-sm"
					dir="auto"
				>
					{cleanedText}
				</p>

				<div className="flex items-center justify-between border-t border-border/60 pt-2.5">
					<CopyButton
						text={cleanedText}
						successMessage="Fact copied to clipboard!"
					/>

					{canEditDelete && (
						<div className="flex items-center gap-0.5">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onEdit(memory)}
								className="h-7 w-7"
								title="Edit"
							>
								<Edit2 className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onDelete(memory)}
								className="h-7 w-7 hover:text-destructive"
								title="Delete"
							>
								<Trash2 className="h-3.5 w-3.5" />
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
		if (currentUser && m.chat_id === currentUser.id.toString()) {
			return `You (${currentUser.first_name || "me"})`;
		}
		const found = chats.find((c) => c.chat_id === m.chat_id);
		if (found) return getChatDisplayName(found);
		return getChatDisplayName({ chat_id: m.chat_id, title: m.chat_title });
	};

	return (
		<div className="space-y-4 animate-in fade-in duration-200">
			<div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
				<SearchInput
					placeholder="Search memories…"
					value={searchQuery}
					onChange={setSearchQuery}
					showClearButton
				/>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={handleExport}
						title="Export as JSON"
					>
						<Download className="h-3.5 w-3.5" />
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
						size="icon"
						onClick={() => fileInputRef.current?.click()}
						title="Import from JSON"
					>
						<Upload className="h-3.5 w-3.5" />
					</Button>

					{role !== "user" && (
						<Button
							variant="outline"
							size="icon"
							onClick={handlePrune}
							disabled={isPruning}
							title="Prune expired memories"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					)}

					<Button onClick={onOpenAddModal} size="sm" className="gap-1.5">
						<Plus className="h-3.5 w-3.5" />
						<span>Add</span>
					</Button>
				</div>
			</div>

			{/* Filters */}
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				<Select value={scopeFilter} onValueChange={setScopeFilter}>
					<SelectTrigger className="text-xs">
						<SelectValue placeholder="Scope" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all" className="text-xs">
							All scopes
						</SelectItem>
						<SelectItem value="mine" className="text-xs">
							Mine
						</SelectItem>
						<SelectItem value="group" className="text-xs">
							Group
						</SelectItem>
					</SelectContent>
				</Select>

				<ChatSelect
					value={chatFilter}
					onValueChange={setChatFilter}
					chats={chats}
					includeAllOption={true}
					allOptionLabel="All groups & chats"
					placeholder="All groups"
				/>

				<CategorySelect
					value={categoryFilter}
					onValueChange={setCategoryFilter}
					includeAllOption={true}
					allOptionLabel="All categories"
					placeholder="All categories"
				/>
			</div>

			<div className="space-y-2.5 pt-1">
				{isLoading && memories.length === 0 ? (
					<LoadingState text="Loading memories…" />
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
						title="Nothing here yet"
						description="No memories matched your filters. Add a fact to get started."
						action={
							<Button size="sm" onClick={onOpenAddModal} className="gap-1.5">
								<Plus className="h-3.5 w-3.5" />
								Add fact
							</Button>
						}
					/>
				)}
			</div>
		</div>
	);
};
