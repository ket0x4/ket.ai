import { Bot, Brain, Home, Settings, Users } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "@/components/AccessDenied";
import { AppNav, type AppNavItem } from "@/components/AppNav";
import { LoadingState } from "@/components/common/LoadingState";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { api, getTelegramWebApp } from "@/lib/api";
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

	const [activeTab, setActiveTab] = useState("dashboard");

	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [chats, setChats] = useState<Chat[]>([]);
	const [memories, setMemories] = useState<Memory[]>([]);
	const [personas, setPersonas] = useState<Persona[]>([]);
	const [activePersonas, setActivePersonas] = useState<
		Record<string, string | null>
	>({});
	const [isLoadingData, setIsLoadingData] = useState(false);

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
			<div className="flex min-h-[100dvh] items-center justify-center text-xs text-muted-foreground">
				Authenticating
			</div>
		);
	}

	if (!isAuthenticated) {
		return <AccessDenied onRetry={authenticate} />;
	}

	const navTabs: AppNavItem[] = [
		{ value: "dashboard", icon: Home, label: "Home" },
		{ value: "memories", icon: Brain, label: "Memory" },
		{ value: "personas", icon: Bot, label: "Personas" },
		{ value: "groups", icon: Users, label: "Groups" },
		...(role === "owner"
			? [{ value: "system", icon: Settings, label: "Settings" }]
			: []),
	];

	return (
		<div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex flex-1 flex-col"
			>
				<main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4">
					<TabsContent value="dashboard">
						<DashboardTab
							stats={stats}
							role={role}
							isLoading={isLoadingData}
							onNavigateToGroups={() => setActiveTab("groups")}
							onRefresh={loadAppData}
							isOptedOut={isOptedOut}
							isUpdatingOptOut={isUpdatingOptOut}
							onToggleOptOut={() => handleToggleOptOut(!isOptedOut)}
						/>
					</TabsContent>

					<TabsContent value="memories">
						<Suspense fallback={<LoadingState text="Loading" />}>
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

					<TabsContent value="personas">
						<Suspense fallback={<LoadingState text="Loading" />}>
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

					<TabsContent value="groups">
						<Suspense fallback={<LoadingState text="Loading" />}>
							<GroupsTab
								chats={chats}
								role={role}
								isLoading={isLoadingData}
								onRefresh={loadAppData}
							/>
						</Suspense>
					</TabsContent>

					{role === "owner" && (
						<TabsContent value="system">
							<Suspense fallback={<LoadingState text="Loading" />}>
								<SystemTab />
							</Suspense>
						</TabsContent>
					)}
				</main>

				<AppNav items={navTabs} />
			</Tabs>

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

			<Toaster position="bottom-right" />
		</div>
	);
}
