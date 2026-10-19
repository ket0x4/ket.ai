import { Bot, Edit3, Plus, Sparkles, Trash2 } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChatSelect, EmptyState, SearchInput } from "@/components/common";
import { Button, Card } from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { cn, getChatDisplayName, normalizeSearchText } from "@/lib/utils";
import type { BaseTabProps, Persona } from "@/types";

const DEFAULT_PERSONA_ID = "ket-default";

interface PersonaCardProps {
	persona: Persona;
	isActive: boolean;
	isSelecting: boolean;
	selectedChatId: string;
	canEdit: boolean;
	onSelect: (personaId: string | null) => void;
	onEdit: (persona: Persona) => void;
	onDelete: (persona: Persona) => void;
}

const PersonaCard: FC<PersonaCardProps> = ({
	persona,
	isActive,
	isSelecting,
	selectedChatId,
	canEdit,
	onSelect,
	onEdit,
	onDelete,
}) => {
	const isSystem = persona.is_system === 1;

	return (
		<Card className={cn(isActive && "border-primary/50")}>
			<div className="space-y-3 p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h3 className="truncate text-sm font-medium" dir="auto">
								{persona.name}
							</h3>
							<span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
								{isSystem ? "system" : "custom"}
							</span>
						</div>
						<p
							className="mt-0.5 line-clamp-2 text-xs text-muted-foreground"
							dir="auto"
						>
							{persona.description || "No description."}
						</p>
					</div>
					{isActive && (
						<span className="flex shrink-0 items-center gap-1 text-[11px] text-primary">
							<span className="h-1.5 w-1.5 rounded-full bg-primary" />
							active
						</span>
					)}
				</div>

				<div
					className="line-clamp-3 break-words rounded-lg border border-border/60 bg-background/40 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground"
					dir="auto"
				>
					{persona.prompt}
				</div>

				<div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
					<Button
						size="sm"
						variant={isActive ? "secondary" : "outline"}
						disabled={isActive || isSelecting || !selectedChatId}
						onClick={() =>
							onSelect(persona.id === DEFAULT_PERSONA_ID ? null : persona.id)
						}
						className="flex-1"
					>
						{isActive ? "Active here" : "Use here"}
					</Button>

					{canEdit && (
						<div className="flex items-center gap-0.5">
							<Button
								size="icon"
								variant="ghost"
								className="h-7 w-7"
								onClick={() => onEdit(persona)}
								title="Edit"
							>
								<Edit3 className="h-3.5 w-3.5" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="h-7 w-7 hover:text-destructive"
								onClick={() => onDelete(persona)}
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

interface PersonasTabProps extends BaseTabProps<Persona> {
	personas: Persona[];
	activePersonas: Record<string, string | null>;
}

export const PersonasTab: FC<PersonasTabProps> = ({
	chats,
	currentUser,
	role,
	adminChatIds,
	personas,
	activePersonas,
	onOpenAddModal,
	onOpenEditModal,
	onRefresh,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedChatId, setSelectedChatId] = useState<string>("");

	const { isLoading: isSelectingPersona, execute: executeSelect } =
		useAsyncAction();
	const { execute: executeDelete } = useAsyncAction();

	const currentUserIdStr = currentUser ? currentUser.id.toString() : "";

	const manageableGroupChats = useMemo(
		() =>
			chats.filter(
				(c) =>
					c.chat_id !== currentUserIdStr &&
					(role === "owner" || adminChatIds.includes(c.chat_id)),
			),
		[chats, currentUserIdStr, role, adminChatIds],
	);

	useEffect(() => {
		if (!selectedChatId) {
			const fallbackId = currentUserIdStr || manageableGroupChats[0]?.chat_id;
			if (fallbackId) setSelectedChatId(fallbackId);
		}
	}, [currentUserIdStr, manageableGroupChats, selectedChatId]);

	const currentActivePersona = useMemo(() => {
		const activeId = selectedChatId ? activePersonas[selectedChatId] : null;
		if (!activeId || activeId === DEFAULT_PERSONA_ID) return null;
		return personas.find((p) => p.id === activeId) || null;
	}, [selectedChatId, activePersonas, personas]);

	const handleSelectPersona = async (personaId: string | null) => {
		if (!selectedChatId) {
			toast.error("Please select a group or chat first");
			return;
		}

		const targetId = personaId === DEFAULT_PERSONA_ID ? null : personaId;

		await executeSelect(
			async () => {
				await api.personas.select({
					chatId: selectedChatId,
					personaId: targetId,
				});

				if (targetId) {
					const p = personas.find((item) => item.id === targetId);
					toast.success(`"${p?.name || "Persona"}" activated for this chat!`);
				} else {
					toast.success("Reset to default ket.ai persona.");
				}
				await onRefresh();
			},
			{ errorMessage: "Error selecting persona" },
		);
	};

	const handleDeletePersona = async (persona: Persona) => {
		if (persona.is_system === 1) {
			toast.error("Built-in system personas cannot be deleted.");
			return;
		}

		if (
			!window.confirm(
				`Are you sure you want to delete the "${persona.name}" persona?`,
			)
		) {
			return;
		}

		await executeDelete(
			async () => {
				await api.personas.delete(persona.id);
				toast.success("Persona deleted successfully");
				await onRefresh();
			},
			{ errorMessage: "Error deleting persona" },
		);
	};

	const filteredPersonas = useMemo(() => {
		if (!searchQuery.trim()) return personas;
		const normQ = normalizeSearchText(searchQuery);
		return personas.filter(
			(p) =>
				normalizeSearchText(p.name).includes(normQ) ||
				normalizeSearchText(p.description || "").includes(normQ) ||
				normalizeSearchText(p.prompt).includes(normQ),
		);
	}, [personas, searchQuery]);

	const personalLabel = currentUser
		? `You (${currentUser.first_name})`
		: "Personal Chat";

	const selectedChatTitle = useMemo(() => {
		if (selectedChatId && selectedChatId === currentUserIdStr) {
			return personalLabel;
		}
		const group = manageableGroupChats.find(
			(c) => c.chat_id === selectedChatId,
		);
		return group ? getChatDisplayName(group) : "this chat";
	}, [selectedChatId, currentUserIdStr, personalLabel, manageableGroupChats]);

	const hasAnyManageableChat =
		Boolean(currentUserIdStr) || manageableGroupChats.length > 0;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-2">
					{hasAnyManageableChat && (
						<ChatSelect
							value={selectedChatId}
							onValueChange={setSelectedChatId}
							chats={manageableGroupChats}
							currentUser={currentUser}
							includePersonalOption={Boolean(currentUser)}
							personalOptionLabel={personalLabel}
							placeholder="Select chat"
							triggerClassName="w-full sm:w-[240px]"
						/>
					)}
				</div>

				<div className="flex items-center gap-2">
					<SearchInput
						placeholder="Search personas…"
						value={searchQuery}
						onChange={setSearchQuery}
						showClearButton
						containerClassName="flex-1 sm:w-56 sm:flex-none"
					/>
					<Button onClick={onOpenAddModal} size="sm" className="gap-1.5">
						<Plus className="h-4 w-4" />
						<span>New</span>
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
				<Sparkles className="h-4 w-4 shrink-0 text-primary" />
				<div className="min-w-0 flex-1">
					<div
						className="truncate text-[11px] text-muted-foreground"
						dir="auto"
					>
						Active in {selectedChatTitle}
					</div>
					<div className="truncate text-sm font-medium" dir="auto">
						{currentActivePersona
							? currentActivePersona.name
							: "ket.ai (default)"}
					</div>
				</div>
				{currentActivePersona && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleSelectPersona(null)}
						disabled={isSelectingPersona}
					>
						Reset
					</Button>
				)}
			</div>

			<div className="flex items-center justify-between">
				<span className="text-[11px] text-muted-foreground">
					{filteredPersonas.length} of {personas.length} personas
				</span>
			</div>

			{filteredPersonas.length === 0 ? (
				<EmptyState
					icon={Bot}
					title="No personas found"
					description={
						searchQuery
							? "Nothing matched your search."
							: "Create a persona to shape how the bot speaks."
					}
				/>
			) : (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
					{filteredPersonas.map((persona) => {
						const isActiveInSelectedChat = currentActivePersona
							? currentActivePersona.id === persona.id
							: persona.id === DEFAULT_PERSONA_ID;
						const canEdit =
							persona.is_system === 0 &&
							(role === "owner" || persona.created_by === currentUser?.id);

						return (
							<PersonaCard
								key={persona.id}
								persona={persona}
								isActive={isActiveInSelectedChat}
								isSelecting={isSelectingPersona}
								selectedChatId={selectedChatId}
								canEdit={canEdit}
								onSelect={handleSelectPersona}
								onEdit={onOpenEditModal}
								onDelete={handleDeletePersona}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
};
