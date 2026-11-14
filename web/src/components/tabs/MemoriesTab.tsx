import {
	Download,
	Edit2,
	Inbox,
	MoreHorizontal,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import { type ChangeEvent, type FC, useMemo, useRef, useState } from "react";
import {
	CategoryBadge,
	CategorySelect,
	CopyButton,
	EmptyState,
	LoadingState,
	PageHeader,
	SearchInput,
} from "@/components/common";
import { Button, Card } from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import {
	cleanMemoryText,
	cn,
	formatRelativeTime,
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
		<Card className="p-3.5">
			<div className="space-y-2.5">
				<div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
					<div className="flex min-w-0 items-center gap-1.5">
						<CategoryBadge category={memory.category} />
						<span className="truncate" dir="auto">
							{chatLabel}
						</span>
						{userName && (
							<span className="truncate" dir="auto">
								· {userName}
							</span>
						)}
					</div>
					<span className="shrink-0 font-mono tnum">
						{formatRelativeTime(memory.created_at)}
					</span>
				</div>

				<p
					className="break-words text-sm leading-relaxed text-foreground/90"
					dir="auto"
				>
					{cleanedText}
				</p>

				<div className="flex items-center justify-between border-t border-border/50 pt-2">
					<CopyButton text={cleanedText} successMessage="Copied." />

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

function matchesQuery(m: Memory, query: string): boolean {
	const trimmed = query.trim();
	if (!trimmed) return true;

	const normQ = normalizeSearchText(trimmed);
	const cleaned = cleanMemoryText(m.memory_text);
	const textMatch = normalizeSearchText(cleaned).includes(normQ);
	const rawMatch = normalizeSearchText(m.memory_text).includes(normQ);
	const catMatch = normalizeSearchText(m.category || "").includes(normQ);
	const chatMatch = normalizeSearchText(m.chat_title || "").includes(normQ);

	return textMatch || rawMatch || catMatch || chatMatch;
}

function matchesScope(
	m: Memory,
	scope: string,
	user: TelegramUser | null,
): boolean {
	if (scope === "mine") return Boolean(user && m.user_id === user.id);
	if (scope === "group") return !user || m.user_id !== user.id;
	return true;
}

function matchesFilter(
	m: Memory,
	scope: string,
	category: string,
	query: string,
	user: TelegramUser | null,
): boolean {
	if (!matchesScope(m, scope, user)) return false;
	if (category !== "all" && m.category !== category) return false;
	return matchesQuery(m, query);
}

const SCOPES = [
	{ value: "mine", label: "Mine" },
	{ value: "group", label: "Group" },
	{ value: "all", label: "All" },
] as const;

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
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [showTools, setShowTools] = useState(false);

	const { isLoading: isPruning, execute: executePrune } = useAsyncAction();
	const { execute: executeDelete } = useAsyncAction();
	const { execute: executeExport } = useAsyncAction();
	const { execute: executeImport } = useAsyncAction();

	const fileInputRef = useRef<HTMLInputElement>(null);

	const filteredMemories = useMemo(() => {
		return memories.filter((m) =>
			matchesFilter(m, scopeFilter, categoryFilter, searchQuery, currentUser),
		);
	}, [memories, scopeFilter, categoryFilter, searchQuery, currentUser]);

	const handleDelete = async (m: Memory) => {
		if (!window.confirm("Delete this memory?")) return;

		await executeDelete(() => api.memories.delete(m.id), {
			successMessage: "Memory deleted.",
			errorMessage: "Delete failed",
			onSuccess: onRefresh,
		});
	};

	const handlePrune = async () => {
		if (!window.confirm("Prune expired memories?")) return;

		await executePrune(() => api.memories.prune(), {
			successMessage: (res) => `Pruned ${res.prunedCount} memories.`,
			errorMessage: "Prune failed",
			onSuccess: onRefresh,
		});
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
				successMessage: "Exported.",
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
				successMessage: (res) => `Imported ${res?.importedCount ?? 0} records.`,
				errorMessage: "Import failed",
				onSuccess: onRefresh,
			},
		);

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const getChatLabel = (m: Memory) => {
		if (currentUser && m.chat_id === currentUser.id.toString()) {
			return currentUser.first_name || "You";
		}
		const found = chats.find((c) => c.chat_id === m.chat_id);
		if (found) return getChatDisplayName(found);
		return getChatDisplayName({ chat_id: m.chat_id, title: m.chat_title });
	};

	return (
		<div className="space-y-4">
			<PageHeader
				title="Memory"
				actions={
					<>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setShowTools((prev) => !prev)}
							title="More"
							aria-label="More"
							aria-expanded={showTools}
							aria-controls="memory-tools"
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
						<Button onClick={onOpenAddModal} size="sm" className="gap-1">
							<Plus className="h-3.5 w-3.5" />
							<span>Add</span>
						</Button>
					</>
				}
			/>

			<div className="space-y-2">
				<SearchInput
					placeholder="Search memories"
					value={searchQuery}
					onChange={setSearchQuery}
					showClearButton
				/>

				<div className="grid grid-cols-2 gap-2">
					<fieldset
						aria-label="Memory scope"
						className="flex min-w-0 items-center gap-0.5 rounded-lg border border-border p-0.5"
					>
						{SCOPES.map((scope) => (
							<button
								key={scope.value}
								type="button"
								onClick={() => setScopeFilter(scope.value)}
								aria-pressed={scopeFilter === scope.value}
								className={cn(
									"flex-1 rounded-md px-2 py-1 text-[11px] font-medium",
									scopeFilter === scope.value
										? "bg-accent text-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{scope.label}
							</button>
						))}
					</fieldset>
					<CategorySelect
						value={categoryFilter}
						onValueChange={setCategoryFilter}
						includeAllOption={true}
						allOptionLabel="All types"
						placeholder="All types"
					/>
				</div>
			</div>

			{showTools && (
				<div
					id="memory-tools"
					className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card px-1.5 py-1"
				>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleExport}
						className="gap-1 text-[11px]"
					>
						<Download className="h-3.5 w-3.5" />
						Export
					</Button>

					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileChange}
						accept=".json"
						className="hidden"
					/>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						className="gap-1 text-[11px]"
					>
						<Upload className="h-3.5 w-3.5" />
						Import
					</Button>

					{role !== "user" && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handlePrune}
							disabled={isPruning}
							className="gap-1 text-[11px]"
						>
							<Trash2 className="h-3.5 w-3.5" />
							Prune
						</Button>
					)}
				</div>
			)}

			<div>
				{isLoading && memories.length === 0 ? (
					<LoadingState />
				) : filteredMemories.length > 0 ? (
					<div className="space-y-2">
						{filteredMemories.map((m) => (
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
						))}
					</div>
				) : (
					<EmptyState
						icon={Inbox}
						title="No memories"
						description="Add a fact and it will appear here."
					/>
				)}
			</div>
		</div>
	);
};
