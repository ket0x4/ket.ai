import { Crown, ShieldCheck, User as UserIcon } from "lucide-react";
import type { ElementType } from "react";
import type { MemoryCategory, UserRole } from "@/types";

export const DEFAULT_PERSONA_ID = "ket-default";

export interface CategoryMeta {
	value: MemoryCategory;
	label: string;
}

export const MEMORY_CATEGORIES: Record<MemoryCategory, CategoryMeta> = {
	PROFILE: {
		value: "PROFILE",
		label: "PROFILE",
	},
	DYNAMIC: {
		value: "DYNAMIC",
		label: "DYNAMIC",
	},
	TEMPORARY: {
		value: "TEMPORARY",
		label: "TEMPORARY",
	},
};

export const MEMORY_CATEGORY_LIST: CategoryMeta[] =
	Object.values(MEMORY_CATEGORIES);

export interface RoleMeta {
	role: UserRole;
	label: string;
	icon: ElementType;
}

export const USER_ROLES: Record<UserRole, RoleMeta> = {
	owner: {
		role: "owner",
		label: "Owner",
		icon: Crown,
	},
	admin: {
		role: "admin",
		label: "Admin",
		icon: ShieldCheck,
	},
	user: {
		role: "user",
		label: "User",
		icon: UserIcon,
	},
};
