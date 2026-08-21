import {
	Bot,
	Check,
	CheckCircle2,
	Edit3,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getChatDisplayName } from "@/lib/utils";
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
		<Card
			className={`relative overflow-hidden transition-all duration-200 border bg-card ${
				isActive
					? "border-primary/60 shadow-md shadow-primary/10 ring-1 ring-primary/30"
					: "border-border/70 hover:border-border hover:shadow-sm"
			}`}
		>
			{isActive && (
				<div className="absolute top-3 right-3">
					<Badge
						variant="default"
						className="bg-primary text-primary-foreground text-[10px] gap-1 shadow-sm px-2 py-0.5"
					>
						<Check className="w-3 h-3" />
						<span>Active</span>
					</Badge>
				</div>
			)}

			<CardContent className="p-4 sm:p-5 space-y-3.5">
				<div className="flex items-start gap-3 pr-14">
					<div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
						<Bot className="w-5 h-5" />
					</div>
					<div className="space-y-1 min-w-0 flex-1">
						<div className="flex items-center gap-1.5 flex-wrap">
							<h4 className="text-sm font-bold text-foreground truncate">
								{persona.name}
							</h4>
							{isSystem ? (
								<Badge
									variant="secondary"
									className="text-[9px] px-1.5 py-0 h-4 bg-muted text-muted-foreground font-normal"
								>
									System
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary font-normal"
								>
									Custom
								</Badge>
							)}
						</div>
						<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
							{persona.description || "No description provided."}
						</p>
					</div>
				</div>

				<div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-[11px] font-mono text-muted-foreground line-clamp-3 leading-relaxed break-words">
					<span className="text-primary font-semibold font-sans mr-1">
						Prompt:
					</span>
					"{persona.prompt}"
				</div>

				<div className="pt-2 flex items-center justify-between gap-2 border-t border-border/50">
					<Button
						size="sm"
						variant={isActive ? "secondary" : "default"}
						disabled={isActive || isSelecting || !selectedChatId}
						onClick={() => onSelect(persona.id)}
						className="flex-1 text-xs gap-1.5 h-8 font-medium"
					>
						{isActive ? (
							<>
								<CheckCircle2 className="w-3.5 h-3.5 text-primary" />
								<span>Active in this Chat</span>
							</>
						) : (
							<>
								<Sparkles className="w-3.5 h-3.5" />
								<span>Use in Selected Chat</span>
							</>
						)}
					</Button>

					{canEdit && (
						<div className="flex items-center gap-1">
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8 text-muted-foreground hover:text-foreground"
								onClick={() => onEdit(persona)}
								title="Edit"
							>
								<Edit3 className="w-3.5 h-3.5" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
								onClick={() => onDelete(persona)}
								title="Delete"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</Button>
						</div>
					)}
				</div>
			</CardContent>
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
				title: `Private Chat (${currentUser.first_name})`,
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
		const q = searchQuery.toLowerCase();
		return personas.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.description?.toLowerCase().includes(q) ||
				p.prompt.toLowerCase().includes(q),
		);
	}, [personas, searchQuery]);

	const selectedChatTitle =
		manageableChats.find((c) => c.id === selectedChatId)?.title || "Chat";

	return (
		<div className="space-y-6">
			{/* Chat Selector & Header Banner */}
			<div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-lg bg-primary/10 text-primary">
							<Bot className="w-5 h-5" />
						</div>
						<h2 className="text-lg font-bold tracking-tight">
							Persona (Personality) Management
						</h2>
					</div>
					<p className="text-xs text-muted-foreground">
						Define the character, tone, and style the bot adopts in groups or
						private chats.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
					{manageableChats.length > 0 && (
						<div className="flex items-center gap-2 min-w-[200px] sm:min-w-[240px]">
							<Users className="w-4 h-4 text-muted-foreground shrink-0" />
							<Select value={selectedChatId} onValueChange={setSelectedChatId}>
								<SelectTrigger className="w-full bg-muted/40 border-border/80 text-xs">
									<SelectValue placeholder="Select Chat" />
								</SelectTrigger>
								<SelectContent>
									{manageableChats.map((c) => (
										<SelectItem key={c.id} value={c.id} className="text-xs">
											{c.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<Button
						onClick={onOpenAddModal}
						size="sm"
						className="gap-1.5 shadow-sm shadow-primary/20 shrink-0"
					>
						<Plus className="w-4 h-4" />
						<span>New Persona</span>
					</Button>
				</div>
			</div>

			{/* Active Persona Banner for Selected Chat */}
			<div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-sm shrink-0">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
								Active Persona — {selectedChatTitle}
							</span>
						</div>
						<div className="text-base font-bold text-foreground">
							{currentActivePersona
								? currentActivePersona.name
								: "ket.ai Standard (Default)"}
						</div>
						<p className="text-xs text-muted-foreground line-clamp-1">
							{currentActivePersona?.description ||
								"Default balanced, smart, and natural conversation style."}
						</p>
					</div>
				</div>

				{currentActivePersona && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleSelectPersona(null)}
						disabled={isSelectingPersona}
						className="text-xs shrink-0 self-start sm:self-center hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
					>
						Reset to Default
					</Button>
				)}
			</div>

			{/* Search & Stats Bar */}
			<div className="flex items-center justify-between gap-3">
				<div className="relative flex-1 max-w-md">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search personas (name, description, prompt)..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 bg-card border-border/80 text-xs"
					/>
				</div>
				<div className="text-xs text-muted-foreground font-medium shrink-0">
					Total {filteredPersonas.length} Personas
				</div>
			</div>

			{/* Persona Cards Grid */}
			{filteredPersonas.length === 0 ? (
				<div className="text-center py-12 border border-dashed border-border rounded-2xl p-6 bg-card/40">
					<Bot className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
					<h3 className="text-sm font-semibold text-foreground">
						No Personas Found
					</h3>
					<p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
						{searchQuery
							? "No personas found matching your search criteria."
							: "No custom personas created yet. Get started by adding a new one."}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
