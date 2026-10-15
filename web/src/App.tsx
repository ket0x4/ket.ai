import {
	Bot,
	Brain,
	LayoutDashboard,
	Loader2,
	Settings,
	Users,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";
import { LoadingState } from "@/components/common/LoadingState";
import { Header } from "@/components/Header";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, getTelegramWebApp } from "@/lib/api";
import { handleHorizontalWheelScroll } from "@/lib/utils";
import type {
	Chat,
	Memory,
	Persona,
	StatsResponse,
	TelegramUser,
	UserRole,
} from "@/types";

const MemoriesTab = lazy(() =>
	import("@/components/tabs/MemoriesTab").then((m) => ({
		default: m.MemoriesTab,
	})),
);
const PersonasTab = lazy(() =>
	import("@/components/tabs/PersonasTab").then((m) => ({
		default: m.PersonasTab,
	})),
);
const GroupsTab = lazy(() =>
	import("@/components/tabs/GroupsTab").then((m) => ({
		default: m.GroupsTab,
	})),
);
const SystemTab = lazy(() =>
	import("@/components/tabs/SystemTab").then((m) => ({
		default: m.SystemTab,
	})),
);
const MemoryModal = lazy(() =>
	import("@/components/modals/MemoryModal").then((m) => ({
		default: m.MemoryModal,
	})),
);
const PersonaModal = lazy(() =>
	import("@/components/modals/PersonaModal").then((m) => ({
		default: m.PersonaModal,
	})),
);

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
	const [isOptedOut, setIsOptedOut] = useState(false);
	const [isUpdatingOptOut, setIsUpdatingOptOut] = useState(false);

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

	// Toggle user opt-out status
	const handleToggleOptOut = useCallback(async (optedOut: boolean) => {
		try {
			setIsUpdatingOptOut(true);
			const res = await api.user.setOptOut(optedOut);
			setIsOptedOut(res.isOptedOut);
			toast.success(res.message);
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Failed to update opt-out status";
			toast.error(msg);
		} finally {
			setIsUpdatingOptOut(false);
		}
	}, []);

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
				setIsOptedOut(Boolean(auth.isOptedOut ?? auth.user.is_opted_out));
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
			<div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 text-muted-foreground">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span className="text-xs">Authenticating…</span>
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
			label: "Memory",
		},
		{ value: "personas", icon: Bot, label: "Personas" },
		{ value: "groups", icon: Users, label: "Groups" },
		...(role === "owner"
			? [{ value: "system", icon: Settings, label: "Settings & Logs" }]
			: []),
	];

	return (
		<div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
			{/* Top Header */}
			<Header
				user={currentUser}
				role={role}
				isOnline={true}
				isOptedOut={isOptedOut}
				onToggleOptOut={() => handleToggleOptOut(!isOptedOut)}
			/>

			{/* Main Container */}
			<main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-3 py-4 sm:px-6 sm:py-6">
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					{/* Navigation Bar */}
					<div
						className="-mx-1 overflow-x-auto px-1 no-scrollbar touch-pan-x"
						onWheel={handleHorizontalWheelScroll}
					>
						<TabsList className="w-max sm:w-auto">
							{navTabs.map((t) => {
								const Icon = t.icon;
								return (
									<TabsTrigger key={t.value} value={t.value} className="shrink-0 gap-1.5">
										<Icon className="h-3.5 w-3.5" />
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
							isOptedOut={isOptedOut}
							onToggleOptOut={handleToggleOptOut}
							isUpdatingOptOut={isUpdatingOptOut}
						/>
					</TabsContent>

					{/* Tab 2: Memories */}
					<TabsContent value="memories">
						<Suspense
							fallback={
								<LoadingState
									text="Loading Memories..."
									icon={Brain}
									className="py-12"
								/>
							}
						>
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
						</Suspense>
					</TabsContent>

					{/* Tab 3: Personas */}
					<TabsContent value="personas">
						<Suspense
							fallback={
								<LoadingState
									text="Loading Personas..."
									icon={Bot}
									className="py-12"
								/>
							}
						>
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
						</Suspense>
					</TabsContent>

					{/* Tab 4: Groups */}
					<TabsContent value="groups">
						<Suspense
							fallback={
								<LoadingState
									text="Loading Groups..."
									icon={Users}
									className="py-12"
								/>
							}
						>
							<GroupsTab
								chats={chats}
								role={role}
								isLoading={isLoadingData}
								onRefresh={loadAppData}
							/>
						</Suspense>
					</TabsContent>

					{/* Tab 5: System & Logs (Owner) */}
					{role === "owner" && (
						<TabsContent value="system">
							<Suspense
								fallback={
									<LoadingState
										text="Loading System & Logs..."
										icon={Settings}
										className="py-12"
									/>
								}
							>
								<SystemTab />
							</Suspense>
						</TabsContent>
					)}
				</Tabs>
			</main>

			{/* Memory Modal */}
			{memoryModal.open && (
				<Suspense fallback={null}>
					<MemoryModal
						mode={memoryModal.mode}
						memory={memoryModal.memory}
						open={memoryModal.open}
						onOpenChange={(open) =>
							setMemoryModal((prev) => ({ ...prev, open }))
						}
						currentUser={currentUser}
						chats={chats}
						role={role}
						adminChatIds={adminChatIds}
						memberChatIds={memberChatIds}
						onSuccess={loadAppData}
					/>
				</Suspense>
			)}

			{/* Persona Modal */}
			{personaModal.open && (
				<Suspense fallback={null}>
					<PersonaModal
						mode={personaModal.mode}
						persona={personaModal.persona}
						open={personaModal.open}
						onOpenChange={(open) =>
							setPersonaModal((prev) => ({ ...prev, open }))
						}
						onSuccess={loadAppData}
					/>
				</Suspense>
			)}

			{/* Modern Sonner Toast Notifications */}
			<Toaster position="bottom-right" />
		</div>
	);
}
