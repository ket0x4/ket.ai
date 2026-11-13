import { CONFIG } from "../../config/index";
import { db } from "../index";
import { normalizePersonaId } from "../personaDefaults";
import {
	invalidatePersonaCaches,
	readActivePersonaMap,
	readPersonaCaches,
	updateCachedActivePersona,
} from "./cache";
import { stmts } from "./statements";
import type { PersonaRow, RepositorySelf } from "./types";

export const personaMethods = {
	/**
	 * Retrieves all available personas (system presets + custom user-created).
	 */
	getAllPersonas(): PersonaRow[] {
		// Copy the cached list so callers cannot mutate shared cache state.
		return [...readPersonaCaches().list];
	},

	/**
	 * Retrieves a specific persona by its unique ID.
	 */
	getPersonaById(id: string): PersonaRow | null {
		return readPersonaCaches().byId.get(id) ?? null;
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
			createdBy?: number | null;
		},
	): PersonaRow {
		const id =
			params.id ||
			`custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
		const now = Math.floor(Date.now() / 1000);
		const name = params.name.trim();
		const description = params.description?.trim() || null;
		const prompt = params.prompt.trim();
		const createdBy = params.createdBy ?? null;

		stmts.insertPersona.run(
			id,
			name,
			description,
			prompt,
			0,
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
			is_system: 0,
			created_by: createdBy,
			created_at: now,
			updated_at: now,
		};
	},

	/**
	 * Updates an existing custom persona. System personas are immutable.
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
		if (!existing || existing.is_system === 1) return null;

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
		const activeId = readActivePersonaMap().get(chatId);
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
		const activeMap = readActivePersonaMap();
		const { byId } = readPersonaCaches();
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
		const normalizedId = normalizePersonaId(personaId);

		if (normalizedId && !this.getPersonaById(normalizedId)) {
			return false;
		}

		const now = Math.floor(Date.now() / 1000);
		stmts.insertChat.run(chatId, "", CONFIG.DEFAULT_REPLY_PROBABILITY, 0, now);
		stmts.setChatActivePersona.run(normalizedId, chatId);

		updateCachedActivePersona(chatId, normalizedId);
		return true;
	},
};
