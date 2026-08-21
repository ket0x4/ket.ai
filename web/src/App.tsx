import {
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
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { GroupsTab } from "@/components/tabs/GroupsTab";
import { MemoriesTab } from "@/components/tabs/MemoriesTab";
import { SandboxTab } from "@/components/tabs/SandboxTab";
import { SystemTab } from "@/components/tabs/SystemTab";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, getTelegramWebApp } from "@/lib/api";
import type {
	Chat,
	Memory,
	StatsResponse,
	TelegramUser,
	UserRole,
} from "@/types";

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
	const [isLoadingData, setIsLoadingData] = useState(false);

	// Modals state
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

	// Fetch stats, chats, and memories
	const loadAppData = useCallback(async () => {
		if (!isAuthenticated) return;

		try {
			setIsLoadingData(true);
			const [statsRes, chatsRes, memoriesRes] = await Promise.all([
				api.stats.get().catch(() => null),
				api.chats.list().catch(() => []),
				api.memories.list({ scope: "all" }).catch(() => []),
			]);

			if (statsRes) setStats(statsRes);
			setChats(chatsRes || []);
			setMemories(memoriesRes || []);
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
		<div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
			{/* Top Header */}
			<Header user={currentUser} role={role} isOnline={true} />

			{/* Main Container */}
			<main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					{/* Navigation Bar */}
					<div className="overflow-x-auto pb-1 no-scrollbar">
						<TabsList className="w-full justify-start sm:w-auto">
							<TabsTrigger value="dashboard" className="gap-1.5">
								<LayoutDashboard className="w-4 h-4" />
								<span>Dashboard</span>
							</TabsTrigger>

							<TabsTrigger value="memories" className="gap-1.5">
								<Brain className="w-4 h-4" />
								<span>{role === "user" ? "My Facts" : "Memories"}</span>
							</TabsTrigger>

							<TabsTrigger value="groups" className="gap-1.5">
								<Users className="w-4 h-4" />
								<span>Groups</span>
							</TabsTrigger>

							{role === "owner" && (
								<>
									<TabsTrigger value="system" className="gap-1.5">
										<Settings className="w-4 h-4" />
										<span>Settings & Logs</span>
									</TabsTrigger>

									<TabsTrigger value="sandbox" className="gap-1.5">
										<Sparkles className="w-4 h-4" />
										<span>Sandbox</span>
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

					{/* Tab 3: Groups */}
					<TabsContent value="groups">
						<GroupsTab
							chats={chats}
							role={role}
							isLoading={isLoadingData}
							onRefresh={loadAppData}
						/>
					</TabsContent>

					{/* Tab 4: System & Logs (Owner) */}
					{role === "owner" && (
						<TabsContent value="system">
							<SystemTab />
						</TabsContent>
					)}

					{/* Tab 5: AI Sandbox (Owner) */}
					{role === "owner" && (
						<TabsContent value="sandbox">
							<SandboxTab />
						</TabsContent>
					)}
				</Tabs>
			</main>

			{/* Modals */}
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

			{/* Modern Sonner Toast Notifications */}
			<Toaster position="bottom-right" richColors />
		</div>
	);
}
