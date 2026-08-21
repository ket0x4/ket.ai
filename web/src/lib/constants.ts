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

export const SANDBOX_SAMPLE_PROMPTS = [
	"What is your identity and what group are we in?",
	"Summarize what you know about the bot owner.",
	"Search the web for the latest TypeScript release features.",
	"Explain the difference between PROFILE and TEMPORARY memories.",
] as const;
