import { Crown, ShieldCheck, User as UserIcon } from "lucide-react";
import type { ElementType } from "react";
import type { MemoryCategory, UserRole } from "@/types";

export interface CategoryMeta {
	value: MemoryCategory;
	label: string;
	description: string;
	badgeVariant: "profile" | "dynamic" | "temporary";
	textColor: string;
	dotColor: string;
	barColor: string;
	chipBg: string;
	chipBorder: string;
}

export const MEMORY_CATEGORIES: Record<MemoryCategory, CategoryMeta> = {
	PROFILE: {
		value: "PROFILE",
		label: "PROFILE",
		description: "Permanent Profile / Identity",
		badgeVariant: "profile",
		textColor: "text-blue-400",
		dotColor: "bg-blue-400",
		barColor: "bg-blue-500",
		chipBg: "bg-blue-500/10",
		chipBorder: "border-blue-500/20",
	},
	DYNAMIC: {
		value: "DYNAMIC",
		label: "DYNAMIC",
		description: "Preferences & State",
		badgeVariant: "dynamic",
		textColor: "text-emerald-400",
		dotColor: "bg-emerald-400",
		barColor: "bg-emerald-500",
		chipBg: "bg-emerald-500/10",
		chipBorder: "border-emerald-500/20",
	},
	TEMPORARY: {
		value: "TEMPORARY",
		label: "TEMPORARY",
		description: "Short-Lived Event / Context",
		badgeVariant: "temporary",
		textColor: "text-amber-400",
		dotColor: "bg-amber-400",
		barColor: "bg-amber-500",
		chipBg: "bg-amber-500/10",
		chipBorder: "border-amber-500/20",
	},
};

export const MEMORY_CATEGORY_LIST: CategoryMeta[] =
	Object.values(MEMORY_CATEGORIES);

export interface RoleMeta {
	role: UserRole;
	label: string;
	badgeVariant: "owner" | "admin" | "user";
	icon: ElementType;
	iconColor: string;
}

export const USER_ROLES: Record<UserRole, RoleMeta> = {
	owner: {
		role: "owner",
		label: "Owner",
		badgeVariant: "owner",
		icon: Crown,
		iconColor: "text-purple-400",
	},
	admin: {
		role: "admin",
		label: "Admin",
		badgeVariant: "admin",
		icon: ShieldCheck,
		iconColor: "text-blue-400",
	},
	user: {
		role: "user",
		label: "User",
		badgeVariant: "user",
		icon: UserIcon,
		iconColor: "text-zinc-400",
	},
};

export interface SandboxPromptTemplate {
	category: "Memory Recall" | "Reasoning & Tools" | "Persona & Tone";
	label: string;
	prompt: string;
}

export const SANDBOX_PROMPT_TEMPLATES: SandboxPromptTemplate[] = [
	{
		category: "Memory Recall",
		label: "Recall My Identity & Facts",
		prompt:
			"What personal details, preferences, or facts do you remember about me?",
	},
	{
		category: "Memory Recall",
		label: "Recall Bot Owner Info",
		prompt:
			"Who is the bot owner and what are their background, interests, or rules?",
	},
	{
		category: "Memory Recall",
		label: "Recall Group Knowledge",
		prompt:
			"Summarize everything you know from long-term memory about this group and its members.",
	},
	{
		category: "Memory Recall",
		label: "Recall Temporary Status",
		prompt:
			"Do I or anyone in this chat have any temporary events, tasks, or active status saved?",
	},
	{
		category: "Reasoning & Tools",
		label: "Agent Identity & Context",
		prompt:
			"What is your identity, what role do you play, and what context are we in?",
	},
	{
		category: "Reasoning & Tools",
		label: "Web Search Grounding",
		prompt:
			"Search the web for the latest TypeScript release features and summarize.",
	},
	{
		category: "Persona & Tone",
		label: "Explain Memory Hierarchy",
		prompt:
			"Explain how PROFILE, DYNAMIC, and TEMPORARY memories differ in your architecture.",
	},
];
