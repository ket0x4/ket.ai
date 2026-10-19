export interface ChatRow {
	chat_id: string;
	title: string | null;
	reply_probability: number;
	spontaneous_enabled: number; // 0 or 1
	last_random_reply_at: number;
	current_topic: string | null;
	is_allowed: number; // 0 or 1
	active_persona_id: string | null;
	created_at: number;
}

export interface PersonaRow {
	id: string;
	name: string;
	description: string | null;
	prompt: string;
	emoji: string;
	is_system: number; // 0 or 1
	created_by: number | null;
	created_at: number;
	updated_at: number;
}

export interface MessageRow {
	id: number;
	chat_id: string;
	message_id: number;
	user_id: number;
	username: string | null;
	first_name: string | null;
	reply_to_message_id: number | null;
	text: string | null;
	photo_file_id: string | null;
	document_file_id?: string | null;
	document_file_name?: string | null;
	document_mime_type?: string | null;
	is_bot_reply: number; // 0 or 1
	sent_at: number;
}

export interface MemoryItem {
	id: number;
	text: string;
	embedding: Float32Array;
	normalizedEmbedding?: Float32Array;
	createdAt: number;
	userId: number | null;
	category: "PROFILE" | "DYNAMIC" | "TEMPORARY";
	expiresAt: number | null;
}

/**
 * The subset of the assembled `Repository` object that domain modules call via
 * `this`. Method implementations that delegate to other domain methods annotate
 * their `this` parameter with this type so the split modules stay type-safe.
 */
export interface RepositorySelf {
	getChat(chatId: string): ChatRow | null;
	upsertChat(chatId: string, title?: string, isAllowed?: boolean): ChatRow;
	createChat(chatId: string, title?: string, isAllowed?: boolean): ChatRow;
	updateChatSettings(
		chatId: string,
		settings: {
			title?: string;
			reply_probability?: number;
			spontaneous_enabled?: boolean | number;
			last_random_reply_at?: number;
			current_topic?: string | null;
		},
	): void;
	setChatAllowed(chatId: string, allowed: boolean): void;
	isUserOptedOut(userId?: number | null): boolean;
	getMemories(chatId: string, includeOptedOut?: boolean): MemoryItem[];
	sanitizeFtsQuery(query: string): string;
	getPersonaById(id: string): PersonaRow | null;
}
