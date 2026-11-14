import type { MemoryCategory } from "@/types";

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
