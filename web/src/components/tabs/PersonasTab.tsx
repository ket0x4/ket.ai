import { Bot, Edit3, Plus, Sparkles, Trash2 } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchInput } from "@/components/common";
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
import { cn, getChatDisplayName, normalizeSearchText } from "@/lib/utils";
import type { BaseTabProps, Persona } from "@/types";

interface PersonaCardProps {
	persona: Persona;
	isActive: boolean;
	isSelecting: boolean;
	selectedChatId: string;
	canEdit: boolean;
	onSelect: (personaId: string) => void;
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
						onClick={() => onSelect(persona.id)}
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
	const [isSelectingPersona, setIsSelectingPersona] = useState(false);

	const { execute: executeDelete } = useAsyncAction();

	const manageableChats = useMemo(() => {
		const result: Array<{ id: string; title: string; isDM: boolean }> = [];
		if (currentUser) {
			result.push({
				id: currentUser.id.toString(),
				title: `You (${currentUser.first_name})`,
				isDM: true,
			});
		}

		for (const c of chats) {
			if (c.chat_id === currentUser?.id.toString()) continue;
			const canManage = role === "owner" || adminChatIds.includes(c.chat_id);
			if (canManage) {
				result.push({
					id: c.chat_id,
					title: getChatDisplayName(c),
					isDM: false,
				});
			}
		}
		return result;
	}, [chats, currentUser, role, adminChatIds]);

	useEffect(() => {
		if (manageableChats.length > 0 && !selectedChatId) {
			setSelectedChatId(manageableChats[0].id);
		}
	}, [manageableChats, selectedChatId]);

	const currentActivePersonaId = selectedChatId
		? activePersonas[selectedChatId] || null
		: null;

	const currentActivePersona = useMemo(() => {
		if (!currentActivePersonaId) return null;
		return personas.find((p) => p.id === currentActivePersonaId) || null;
	}, [currentActivePersonaId, personas]);

	const handleSelectPersona = async (personaId: string | null) => {
		if (!selectedChatId) {
			toast.error("Please select a group or chat first");
			return;
		}

		setIsSelectingPersona(true);
		try {
			await api.personas.select({
				chatId: selectedChatId,
				personaId,
			});

			if (personaId) {
				const p = personas.find((item) => item.id === personaId);
				toast.success(`"${p?.name || "Persona"}" activated for this chat!`);
			} else {
				toast.success("Reset to default ket.ai persona.");
			}
			await onRefresh();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Error selecting persona";
			toast.error(msg);
		} finally {
			setIsSelectingPersona(false);
		}
	};

	const handleDeletePersona = async (persona: Persona) => {
		if (persona.is_system === 1) {
			toast.error("Built-in system personas cannot be deleted.");
			return;
		}

		const confirmDelete = window.confirm(
			`Are you sure you want to delete the "${persona.name}" persona?`,
		);
		if (!confirmDelete) return;

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

	const selectedChatTitle =
		manageableChats.find((c) => c.id === selectedChatId)?.title || "this chat";

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-2">
					{manageableChats.length > 0 && (
						<Select value={selectedChatId} onValueChange={setSelectedChatId}>
							<SelectTrigger className="w-full text-xs sm:w-[240px]">
								<SelectValue placeholder="Select chat" />
							</SelectTrigger>
							<SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
								{manageableChats.map((c) => (
									<SelectItem key={c.id} value={c.id} className="text-xs">
										<span
											className="block max-w-[200px] truncate sm:max-w-[320px]"
											dir="auto"
										>
											{c.title}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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

			{/* Active persona */}
			<div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
				<Sparkles className="h-4 w-4 shrink-0 text-primary" />
				<div className="min-w-0 flex-1">
					<div className="truncate text-[11px] text-muted-foreground" dir="auto">
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

			{/* Grid */}
			{filteredPersonas.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
					<Bot className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
					<h3 className="text-sm font-medium">No personas found</h3>
					<p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
						{searchQuery
							? "Nothing matched your search."
							: "Create a persona to shape how the bot speaks."}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
					{filteredPersonas.map((persona) => {
						const isActiveInSelectedChat =
							currentActivePersonaId === persona.id ||
							(!currentActivePersonaId && persona.id === "ket-default");
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
