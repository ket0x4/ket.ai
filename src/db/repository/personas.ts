import { CONFIG } from "../../config/index";
import { db } from "../index";
import { stmts } from "./statements";
import type { PersonaRow, RepositorySelf } from "./types";

export const DEFAULT_PERSONA_ID = "ket-default";

let personasListCache: PersonaRow[] | null = null;
let personasByIdCache: Map<string, PersonaRow> | null = null;
let chatActivePersonaCache: Map<string, string> | null = null;

export function invalidatePersonaCaches(): void {
	personasListCache = null;
	personasByIdCache = null;
	chatActivePersonaCache = null;
}

function getPersonaCache(): {
	list: PersonaRow[];
	byId: Map<string, PersonaRow>;
} {
	if (!personasListCache || !personasByIdCache) {
		const rows = stmts.getAllPersonas.all() as PersonaRow[];
		personasListCache = rows;
		personasByIdCache = new Map(rows.map((r) => [r.id, r]));
	}
	return { list: personasListCache, byId: personasByIdCache };
}

function getActivePersonaMapCache(): Map<string, string> {
	if (!chatActivePersonaCache) {
		const rows = stmts.getAllChatActivePersonas.all() as Array<{
			chat_id: string;
			active_persona_id: string;
		}>;
		const map = new Map<string, string>();
		for (const row of rows) {
			if (
				row.active_persona_id &&
				row.active_persona_id !== DEFAULT_PERSONA_ID
			) {
				map.set(row.chat_id, row.active_persona_id);
			}
		}
		chatActivePersonaCache = map;
	}
	return chatActivePersonaCache;
}

export const personaMethods = {
	/**
	 * Retrieves all available personas (system presets + custom user-created).
	 */
	getAllPersonas(): PersonaRow[] {
		return getPersonaCache().list;
	},

	/**
	 * Retrieves a specific persona by its unique ID.
	 */
	getPersonaById(id: string): PersonaRow | null {
		return getPersonaCache().byId.get(id) ?? null;
	},

	/**
	 * Creates a new custom persona.
	 */
	createPersona(
		this: RepositorySelf,
		params: {
			id?: string;
			name: string;
			description?: string | null;
			prompt: string;
			isSystem?: boolean;
			createdBy?: number | null;
		},
	): PersonaRow {
		const id =
			params.id ||
			`custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
		const now = Math.floor(Date.now() / 1000);
		const isSys = params.isSystem ? 1 : 0;
		const name = params.name.trim();
		const description = params.description?.trim() || null;
		const prompt = params.prompt.trim();
		const createdBy = params.createdBy ?? null;

		stmts.insertPersona.run(
			id,
			name,
			description,
			prompt,
			isSys,
			createdBy,
			now,
			now,
		);

		invalidatePersonaCaches();
		return {
			id,
			name,
			description,
			prompt,
			is_system: isSys,
			created_by: createdBy,
			created_at: now,
			updated_at: now,
		};
	},

	/**
	 * Updates an existing custom persona.
	 */
	updatePersona(
		this: RepositorySelf,
		id: string,
		updates: {
			name?: string;
			description?: string | null;
			prompt?: string;
		},
	): PersonaRow | null {
		const existing = this.getPersonaById(id);
		if (!existing) return null;

		const name =
			updates.name !== undefined ? updates.name.trim() : existing.name;
		const description =
			updates.description !== undefined
				? updates.description?.trim() || null
				: existing.description;
		const prompt =
			updates.prompt !== undefined ? updates.prompt.trim() : existing.prompt;
		const now = Math.floor(Date.now() / 1000);

		stmts.updatePersona.run(name, description, prompt, now, id);
		invalidatePersonaCaches();

		return {
			...existing,
			name,
			description,
			prompt,
			updated_at: now,
		};
	},

	/**
	 * Deletes a custom persona and resets any chats that were actively using it.
	 * System personas (is_system = 1) cannot be deleted.
	 */
	deletePersona(this: RepositorySelf, id: string): boolean {
		const persona = this.getPersonaById(id);
		if (!persona || persona.is_system === 1) return false;

		const transaction = db.transaction(() => {
			stmts.clearChatActivePersonaIfMatches.run(id);
			stmts.deletePersona.run(id);
		});

		transaction();
		invalidatePersonaCaches();
		return true;
	},

	/**
	 * Retrieves the active custom persona for a specific chat.
	 * Returns null if the chat uses default ket.ai settings.
	 */
	getActivePersonaForChat(
		this: RepositorySelf,
		chatId: string,
	): PersonaRow | null {
		const activeId = getActivePersonaMapCache().get(chatId);
		if (!activeId) return null;
		return this.getPersonaById(activeId);
	},

	/**
	 * Returns a map of chatId -> active personaId for the given chats (or all chats with an active persona).
	 */
	getActivePersonasMap(
		this: RepositorySelf,
		chatIds?: Iterable<string>,
	): Record<string, string | null> {
		const activeMap = getActivePersonaMapCache();
		const { byId } = getPersonaCache();
		const result: Record<string, string | null> = {};

		if (!chatIds) {
			for (const [chatId, personaId] of activeMap) {
				if (byId.has(personaId)) {
					result[chatId] = personaId;
				}
			}
			return result;
		}

		for (const chatId of chatIds) {
			const personaId = activeMap.get(chatId);
			result[chatId] = personaId && byId.has(personaId) ? personaId : null;
		}
		return result;
	},

	/**
	 * Sets or clears the active persona for a chat.
	 */
	setActivePersonaForChat(
		this: RepositorySelf,
		chatId: string,
		personaId: string | null,
	): boolean {
		const normalizedId =
			personaId && personaId !== DEFAULT_PERSONA_ID ? personaId : null;

		if (normalizedId && !this.getPersonaById(normalizedId)) {
			return false;
		}

		const now = Math.floor(Date.now() / 1000);
		stmts.insertChat.run(chatId, "", CONFIG.DEFAULT_REPLY_PROBABILITY, 0, now);
		stmts.setChatActivePersona.run(normalizedId, chatId);

		if (chatActivePersonaCache) {
			if (normalizedId) {
				chatActivePersonaCache.set(chatId, normalizedId);
			} else {
				chatActivePersonaCache.delete(chatId);
			}
		}
		return true;
	},
};
