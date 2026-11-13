import { Bot, Edit3, Plus, Trash2 } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ChatSelect,
	EmptyState,
	PageHeader,
	SearchInput,
} from "@/components/common";
import { Button, Card } from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { api } from "@/lib/api";
import { DEFAULT_PERSONA_ID } from "@/lib/constants";
import { cn, normalizeSearchText } from "@/lib/utils";
import type { BaseTabProps, Persona } from "@/types";

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
		<Card className={cn("p-3.5", isActive && "border-primary/40")}>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						<h3 className="truncate text-sm font-medium" dir="auto">
							{persona.name}
						</h3>
						<span className="shrink-0 text-[10px] text-muted-foreground">
							{isSystem ? "system" : "custom"}
						</span>
					</div>
					{persona.description && (
						<p
							className="mt-0.5 line-clamp-2 text-[11px] leading-normal text-muted-foreground"
							dir="auto"
						>
							{persona.description}
						</p>
					)}
				</div>
				{isActive && (
					<span className="shrink-0 text-[10px] text-primary">active</span>
				)}
			</div>

			<div className="mt-3 flex items-center justify-between gap-2">
				<Button
					size="sm"
					variant={isActive ? "secondary" : "outline"}
					disabled={isActive || isSelecting || !selectedChatId}
					onClick={() => onSelect(persona.id)}
					className="h-7 px-2.5 text-[11px]"
				>
					{isActive ? "Active" : "Use"}
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
			toast.error("Select a chat first.");
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
					toast.success(`"${p?.name || "Persona"}" activated.`);
				} else {
					toast.success("Reset to default.");
				}
				await onRefresh();
			},
			{ errorMessage: "Could not select persona" },
		);
	};

	const handleDeletePersona = async (persona: Persona) => {
		if (persona.is_system === 1) {
			toast.error("System personas cannot be deleted.");
			return;
		}

		if (!window.confirm(`Delete "${persona.name}"?`)) {
			return;
		}

		await executeDelete(
			async () => {
				await api.personas.delete(persona.id);
				toast.success("Persona deleted.");
				await onRefresh();
			},
			{ errorMessage: "Could not delete persona" },
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

	const hasAnyManageableChat =
		Boolean(currentUserIdStr) || manageableGroupChats.length > 0;

	return (
		<div className="space-y-4">
			<PageHeader
				title="Personas"
				actions={
					<Button onClick={onOpenAddModal} size="sm" className="gap-1">
						<Plus className="h-3.5 w-3.5" />
						<span>New</span>
					</Button>
				}
			/>

			<div className="space-y-2">
				{hasAnyManageableChat && (
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<ChatSelect
							value={selectedChatId}
							onValueChange={setSelectedChatId}
							chats={manageableGroupChats}
							currentUser={currentUser}
							includePersonalOption={Boolean(currentUser)}
							personalOptionLabel={
								currentUser ? `${currentUser.first_name} (you)` : undefined
							}
							placeholder="Select chat"
							triggerClassName="w-full sm:w-[240px]"
						/>
						<div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
							<span>Active</span>
							<span className="truncate font-medium text-foreground">
								{currentActivePersona?.name || "ket.ai"}
							</span>
							{currentActivePersona && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleSelectPersona(null)}
									disabled={isSelectingPersona}
									className="h-6 px-1.5 text-[11px]"
								>
									Reset
								</Button>
							)}
						</div>
					</div>
				)}

				<SearchInput
					placeholder="Search personas"
					value={searchQuery}
					onChange={setSearchQuery}
					showClearButton
				/>
			</div>

			{filteredPersonas.length === 0 ? (
				<EmptyState
					icon={Bot}
					title="No personas"
					description="Create one to shape how the bot speaks."
				/>
			) : (
				<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
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
