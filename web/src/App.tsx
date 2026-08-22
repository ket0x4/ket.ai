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
	const [memoryModal, setMemoryModal] = useState<{
		open: boolean;
		mode: "add" | "edit";
		memory?: Memory | null;
	}>({ open: false, mode: "add", memory: null });

	const [personaModal, setPersonaModal] = useState<{
		open: boolean;
		mode: "add" | "edit";
		persona?: Persona | null;
	}>({ open: false, mode: "add", persona: null });

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

	const navTabs = [
		{ value: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
		{
			value: "memories",
			icon: Brain,
			label: role === "user" ? "Personal Memory" : "Group Memory",
		},
		{ value: "personas", icon: Bot, label: "Personas" },
		{ value: "groups", icon: Users, label: "Groups" },
		...(role === "owner"
			? [
					{ value: "system", icon: Settings, label: "Settings & Logs" },
					{ value: "sandbox", icon: Sparkles, label: "AI Sandbox" },
				]
			: []),
	];

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
							{navTabs.map((t) => {
								const Icon = t.icon;
								return (
									<TabsTrigger
										key={t.value}
										value={t.value}
										className="gap-1.5 text-xs shrink-0 whitespace-nowrap"
									>
										<Icon className="w-3.5 h-3.5" />
										<span>{t.label}</span>
									</TabsTrigger>
								);
							})}
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
							onOpenAddModal={() =>
								setMemoryModal({ open: true, mode: "add", memory: null })
							}
							onOpenEditModal={(m) =>
								setMemoryModal({ open: true, mode: "edit", memory: m })
							}
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
							onOpenAddModal={() =>
								setPersonaModal({ open: true, mode: "add", persona: null })
							}
							onOpenEditModal={(p) =>
								setPersonaModal({ open: true, mode: "edit", persona: p })
							}
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
							<SandboxTab chats={chats} personas={personas} />
						</TabsContent>
					)}
				</Tabs>
			</main>

			{/* Memory Modal */}
			<MemoryModal
				mode={memoryModal.mode}
				memory={memoryModal.memory}
				open={memoryModal.open}
				onOpenChange={(open) => setMemoryModal((prev) => ({ ...prev, open }))}
				currentUser={currentUser}
				chats={chats}
				role={role}
				adminChatIds={adminChatIds}
				memberChatIds={memberChatIds}
				onSuccess={loadAppData}
			/>

			{/* Persona Modal */}
			<PersonaModal
				mode={personaModal.mode}
				persona={personaModal.persona}
				open={personaModal.open}
				onOpenChange={(open) => setPersonaModal((prev) => ({ ...prev, open }))}
				onSuccess={loadAppData}
			/>

			{/* Modern Sonner Toast Notifications */}
			<Toaster position="bottom-right" richColors />
		</div>
	);
}
