import {
	Bot,
	Brain,
	LayoutDashboard,
	Loader2,
	Settings,
	Sparkles,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";
import { Header } from "@/components/Header";
import { MemoryModal } from "@/components/modals/MemoryModal";
import { PersonaModal } from "@/components/modals/PersonaModal";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { GroupsTab } from "@/components/tabs/GroupsTab";
import { MemoriesTab } from "@/components/tabs/MemoriesTab";
import { PersonasTab } from "@/components/tabs/PersonasTab";
import { SandboxTab } from "@/components/tabs/SandboxTab";
import { SystemTab } from "@/components/tabs/SystemTab";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, getTelegramWebApp } from "@/lib/api";
import type {
	Chat,
	Memory,
	Persona,
	StatsResponse,
	TelegramUser,
	UserRole,
} from "@/types";

async function fetchAllAppData() {
	const [stats, chats, memories, personas] = await Promise.all([
		api.stats.get().catch(() => null),
		api.chats.list().catch(() => []),
		api.memories.list({ scope: "all" }).catch(() => []),
		api.personas.list().catch(() => ({ personas: [], activePersonas: {} })),
	]);
	return { stats, chats, memories, personas };
}

export default function App() {
	const [authChecked, setAuthChecked] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
	const [role, setRole] = useState<UserRole>("user");
	const [adminChatIds, setAdminChatIds] = useState<string[]>([]);
	const [memberChatIds, setMemberChatIds] = useState<string[]>([]);

	// Navigation tab state
	const [activeTab, setActiveTab] = useState("dashboard");

	// Shared application data
	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [chats, setChats] = useState<Chat[]>([]);
	const [memories, setMemories] = useState<Memory[]>([]);
	const [personas, setPersonas] = useState<Persona[]>([]);
	const [activePersonas, setActivePersonas] = useState<
		Record<string, string | null>
	>({});
	const [isLoadingData, setIsLoadingData] = useState(false);

	// Modals state
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

	const [isAddPersonaModalOpen, setIsAddPersonaModalOpen] = useState(false);
	const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
	const [isEditPersonaModalOpen, setIsEditPersonaModalOpen] = useState(false);

	// Authenticate session
	const authenticate = useCallback(async () => {
		const tg = getTelegramWebApp();
		tg?.ready();
		tg?.expand();

		try {
			setAuthChecked(false);
			const auth = await api.auth.me();
			if (auth.valid && auth.user) {
				setIsAuthenticated(true);
				setCurrentUser(auth.user);
				setRole(auth.role || "user");
				setAdminChatIds(auth.adminChatIds || []);
				setMemberChatIds(auth.memberChatIds || []);
			} else {
				setIsAuthenticated(false);
			}
		} catch {
			setIsAuthenticated(false);
		} finally {
			setAuthChecked(true);
		}
	}, []);

	// Fetch stats, chats, memories, and personas
	const loadAppData = useCallback(async () => {
		if (!isAuthenticated) return;

		try {
			setIsLoadingData(true);
			const data = await fetchAllAppData();
			if (data.stats) setStats(data.stats);
			setChats(data.chats);
			setMemories(data.memories);
			setPersonas(data.personas.personas);
			setActivePersonas(data.personas.activePersonas);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Error loading data";
			toast.error(msg);
		} finally {
			setIsLoadingData(false);
		}
	}, [isAuthenticated]);

	useEffect(() => {
		authenticate();
	}, [authenticate]);

	useEffect(() => {
		if (isAuthenticated) {
			loadAppData();
		}
	}, [isAuthenticated, loadAppData]);

	if (!authChecked) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
				<span className="text-sm font-medium">
					Authenticating Telegram session...
				</span>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <AccessDenied onRetry={authenticate} />;
	}

	return (
		<div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
			{/* Top Header */}
			<Header user={currentUser} role={role} isOnline={true} />

			{/* Main Container */}
			<main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					{/* Navigation Bar */}
					<div className="overflow-x-auto pb-1.5 no-scrollbar -mx-1 px-1 touch-pan-x">
						<TabsList className="inline-flex w-max sm:w-auto p-1 bg-secondary/50 border border-border/60 rounded-xl gap-1">
							<TabsTrigger
								value="dashboard"
								className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
							>
								<LayoutDashboard className="w-3.5 h-3.5" />
								<span>Dashboard</span>
							</TabsTrigger>

							<TabsTrigger
								value="memories"
								className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
							>
								<Brain className="w-3.5 h-3.5" />
								<span>
									{role === "user" ? "Personal Memory" : "Group Memory"}
								</span>
							</TabsTrigger>

							<TabsTrigger
								value="personas"
								className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
							>
								<Bot className="w-3.5 h-3.5" />
								<span>Personas</span>
							</TabsTrigger>

							<TabsTrigger
								value="groups"
								className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
							>
								<Users className="w-3.5 h-3.5" />
								<span>Groups</span>
							</TabsTrigger>

							{role === "owner" && (
								<>
									<TabsTrigger
										value="system"
										className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
									>
										<Settings className="w-3.5 h-3.5" />
										<span>Settings & Logs</span>
									</TabsTrigger>

									<TabsTrigger
										value="sandbox"
										className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
									>
										<Sparkles className="w-3.5 h-3.5" />
										<span>AI Sandbox</span>
									</TabsTrigger>
								</>
							)}
						</TabsList>
					</div>

					{/* Tab 1: Dashboard */}
					<TabsContent value="dashboard">
						<DashboardTab
							stats={stats}
							role={role}
							isLoading={isLoadingData}
							onNavigateToGroups={() => setActiveTab("groups")}
							onRefresh={loadAppData}
						/>
					</TabsContent>

					{/* Tab 2: Memories */}
					<TabsContent value="memories">
						<MemoriesTab
							memories={memories}
							chats={chats}
							currentUser={currentUser}
							role={role}
							adminChatIds={adminChatIds}
							isLoading={isLoadingData}
							onOpenAddModal={() => setIsAddModalOpen(true)}
							onOpenEditModal={(m) => {
								setEditingMemory(m);
								setIsEditModalOpen(true);
							}}
							onRefresh={loadAppData}
						/>
					</TabsContent>

					{/* Tab 3: Personas */}
					<TabsContent value="personas">
						<PersonasTab
							chats={chats}
							currentUser={currentUser}
							role={role}
							adminChatIds={adminChatIds}
							personas={personas}
							activePersonas={activePersonas}
							isLoading={isLoadingData}
							onOpenAddModal={() => setIsAddPersonaModalOpen(true)}
							onOpenEditModal={(p) => {
								setEditingPersona(p);
								setIsEditPersonaModalOpen(true);
							}}
							onRefresh={loadAppData}
						/>
					</TabsContent>

					{/* Tab 4: Groups */}
					<TabsContent value="groups">
						<GroupsTab
							chats={chats}
							role={role}
							isLoading={isLoadingData}
							onRefresh={loadAppData}
						/>
					</TabsContent>

					{/* Tab 5: System & Logs (Owner) */}
					{role === "owner" && (
						<TabsContent value="system">
							<SystemTab />
						</TabsContent>
					)}

					{/* Tab 6: AI Sandbox (Owner) */}
					{role === "owner" && (
						<TabsContent value="sandbox">
							<SandboxTab />
						</TabsContent>
					)}
				</Tabs>
			</main>

			{/* Memory Modals */}
			<MemoryModal
				mode="add"
				open={isAddModalOpen}
				onOpenChange={setIsAddModalOpen}
				currentUser={currentUser}
				chats={chats}
				role={role}
				adminChatIds={adminChatIds}
				memberChatIds={memberChatIds}
				onSuccess={loadAppData}
			/>

			<MemoryModal
				mode="edit"
				memory={editingMemory}
				open={isEditModalOpen}
				onOpenChange={setIsEditModalOpen}
				currentUser={currentUser}
				onSuccess={loadAppData}
			/>

			{/* Persona Modals */}
			<PersonaModal
				mode="add"
				open={isAddPersonaModalOpen}
				onOpenChange={setIsAddPersonaModalOpen}
				onSuccess={loadAppData}
			/>

			<PersonaModal
				mode="edit"
				persona={editingPersona}
				open={isEditPersonaModalOpen}
				onOpenChange={setIsEditPersonaModalOpen}
				onSuccess={loadAppData}
			/>

			{/* Modern Sonner Toast Notifications */}
			<Toaster position="bottom-right" richColors />
		</div>
	);
}
