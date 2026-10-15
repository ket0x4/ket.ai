import { db } from "../index";
import { stmts } from "./statements";
import type { PersonaRow, RepositorySelf } from "./types";

export const personaMethods = {
	/**
	 * Retrieves all available personas (system presets + custom user-created).
	 */
	getAllPersonas(): PersonaRow[] {
		return stmts.getAllPersonas.all() as PersonaRow[];
	},

	/**
	 * Retrieves a specific persona by its unique ID.
	 */
	getPersonaById(id: string): PersonaRow | null {
		return stmts.getPersonaById.get(id) as PersonaRow | null;
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
			emoji?: string;
			isSystem?: boolean;
			createdBy?: number | null;
		},
	): PersonaRow {
		const id =
			params.id ||
			`custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
		const now = Math.floor(Date.now() / 1000);
		const isSys = params.isSystem ? 1 : 0;
		const emoji = params.emoji || "";
		const description = params.description || null;
		const createdBy = params.createdBy ?? null;

		stmts.insertPersona.run(
			id,
			params.name.trim(),
			description ? description.trim() : null,
			params.prompt.trim(),
			emoji,
			isSys,
			createdBy,
			now,
			now,
		);

		const created = this.getPersonaById(id);
		if (!created) {
			throw new Error(`Failed to create persona '${id}'`);
		}
		return created;
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
			emoji?: string;
		},
	): PersonaRow | null {
		const existing = this.getPersonaById(id);
		if (!existing) return null;

		const name =
			updates.name !== undefined ? updates.name.trim() : existing.name;
		const description =
			updates.description !== undefined
				? updates.description
					? updates.description.trim()
					: null
				: existing.description;
		const prompt =
			updates.prompt !== undefined ? updates.prompt.trim() : existing.prompt;
		const emoji = updates.emoji !== undefined ? updates.emoji : existing.emoji;
		const now = Math.floor(Date.now() / 1000);

		stmts.updatePersona.run(name, description, prompt, emoji, now, id);
		return this.getPersonaById(id);
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
		return true;
	},

	/**
	 * Retrieves the active persona for a specific chat.
	 * Returns null if the chat uses default ket.ai settings.
	 */
	getActivePersonaForChat(chatId: string): PersonaRow | null {
		return stmts.getChatActivePersona.get(chatId) as PersonaRow | null;
	},

	/**
	 * Sets or clears the active persona for a chat.
	 */
	setActivePersonaForChat(
		this: RepositorySelf,
		chatId: string,
		personaId: string | null,
	): boolean {
		this.createChat(chatId, "");
		if (personaId) {
			const persona = this.getPersonaById(personaId);
			if (!persona) return false;
			stmts.setChatActivePersona.run(personaId, chatId);
		} else {
			stmts.setChatActivePersona.run(null, chatId);
		}
		return true;
	},
};
