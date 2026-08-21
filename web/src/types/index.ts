export interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: boolean;
	photo_url?: string;
}

export type UserRole = "owner" | "admin" | "user";

export interface AuthContext {
	valid: boolean;
	user?: TelegramUser;
	role: UserRole;
	isOwner: boolean;
	adminChatIds: string[];
	memberChatIds: string[];
}

interface CategoryStats {
	PROFILE: number;
	DYNAMIC: number;
	TEMPORARY: number;
}

interface TopChat {
	chat_id: string;
	title?: string;
	message_count: number;
}

export interface StatsResponse {
	role: UserRole;
	totalChats?: number;
	allowedChats?: number;
	totalMemories: number;
	totalMessages: number;
	categoryStats?: CategoryStats;
	uptimeSeconds?: number;
	memoryUsageMb?: number;
	dbSizeBytes?: number;
	model?: string;
	topChats?: TopChat[];
	managedGroupsCount?: number;
	totalGroups?: number;
}

export type MemoryCategory = "PROFILE" | "DYNAMIC" | "TEMPORARY";

export interface Memory {
	id: number;
	chat_id: string;
	chat_title?: string;
	user_id?: number;
	user_first_name?: string;
	user_username?: string;
	memory_text: string;
	category: MemoryCategory;
	created_at: number;
	updated_at?: number;
}

interface ChatStats {
	totalMessages: number;
	uniqueUsers: number;
}

export interface Persona {
	id: string;
	name: string;
	description?: string | null;
	prompt: string;
	emoji?: string;
	is_system: number; // 0 or 1
	created_by?: number | null;
	created_at: number;
	updated_at: number;
}

export interface Chat {
	chat_id: string;
	title?: string;
	is_allowed: boolean;
	reply_probability?: number;
	active_persona_id?: string | null;
	isAdmin?: boolean;
	memoryCount?: number;
	stats?: ChatStats;
}

export interface BotSettings {
	gemini_model?: string;
	default_reply_probability?: number;
	chat_history_limit?: number;
	max_agent_steps?: number;
	log_level?: string;
	enable_web_search?: boolean;
}

export interface LogEntry {
	level: "DEBUG" | "INFO" | "WARN" | "ERROR" | string;
	timestamp: string;
	message: string;
}

export interface ToolTrace {
	toolName: string;
	args: Record<string, unknown> | unknown;
	result?: Record<string, unknown> | unknown;
	timestamp: string;
}

export interface SandboxResponse {
	reply: string;
	executionTimeMs: number;
	model: string;
}

export interface BaseTabProps<T = unknown> {
	chats: Chat[];
	currentUser: TelegramUser | null;
	role: UserRole;
	adminChatIds: string[];
	isLoading?: boolean;
	onOpenAddModal: () => void;
	onOpenEditModal: (item: T) => void;
	onRefresh: () => void | Promise<void>;
}
