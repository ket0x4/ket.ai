import type { AuthContext, TelegramUser } from "../../../web/src/types";
import { db } from "../../db/index";
import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { errorResponse, jsonResponse } from "../http";

function handlePersonasGet(auth: AuthContext): Response {
	try {
		const personas = Repository.getAllPersonas();
		const activePersonas: Record<string, string | null> = {};

		const chatIdsSet = new Set<string>();
		if (auth.user) {
			chatIdsSet.add(auth.user.id.toString());
		}
		if (auth.isOwner) {
			const allChats = db.prepare("SELECT chat_id FROM chats").all() as Array<{
				chat_id: string;
			}>;
			for (const c of allChats) {
				chatIdsSet.add(c.chat_id);
			}
		} else {
			for (const id of auth.adminChatIds) {
				chatIdsSet.add(id);
			}
			for (const id of auth.memberChatIds) {
				chatIdsSet.add(id);
			}
		}

		for (const chatId of chatIdsSet) {
			const active = Repository.getActivePersonaForChat(chatId);
			activePersonas[chatId] = active ? active.id : null;
		}

		return jsonResponse({
			personas,
			activePersonas,
		});
	} catch (e) {
		logger.error("[Server] Error fetching personas:", e);
		return errorResponse("Failed to fetch personas", 500);
	}
}

function requireAuthUser(auth: AuthContext): TelegramUser | null {
	if (!auth.valid || !auth.user) return null;
	return auth.user;
}

type PersonaLookupResult =
	| {
			success: true;
			id: string;
			persona: NonNullable<ReturnType<typeof Repository.getPersonaById>>;
	  }
	| { success: false; response: Response };

function resolvePersonaForMutation(
	pathname: string,
	auth: AuthContext,
	actionName: string,
): PersonaLookupResult {
	const user = requireAuthUser(auth);
	if (!user) {
		return {
			success: false,
			response: errorResponse("Unauthorized: Valid session required", 401),
		};
	}

	const id = pathname.replace("/api/personas/", "");
	if (!id) {
		return { success: false, response: errorResponse("Invalid persona ID") };
	}

	const persona = Repository.getPersonaById(id);
	if (!persona) {
		return {
			success: false,
			response: errorResponse("Persona not found", 404),
		};
	}

	if (persona.is_system === 1) {
		return {
			success: false,
			response: errorResponse(
				`Forbidden: Cannot ${actionName} built-in system persona`,
				403,
			),
		};
	}

	const isCreator = persona.created_by === user.id;
	if (!auth.isOwner && !isCreator) {
		return {
			success: false,
			response: errorResponse(
				`Forbidden: You can only ${actionName} personas you created`,
				403,
			),
		};
	}

	return { success: true, id, persona };
}

async function handlePersonaCreate(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	const user = requireAuthUser(auth);
	if (!user) return errorResponse("Unauthorized: Valid session required", 401);

	try {
		const payload = (await req.json()) as Record<string, string | undefined>;
		const personaName = payload.name?.trim();
		const personaPrompt = payload.prompt?.trim();

		if (!personaName) return errorResponse("Persona name is required");
		if (!personaPrompt) return errorResponse("Persona prompt is required");

		const persona = Repository.createPersona({
			name: personaName,
			description: payload.description,
			prompt: personaPrompt,
			emoji: payload.emoji || "",
			isSystem: false,
			createdBy: user.id,
		});

		return jsonResponse({ success: true, persona });
	} catch (e) {
		logger.error("[Server] Error creating persona:", e);
		return errorResponse("Failed to create persona", 500);
	}
}

async function handlePersonaPatch(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	const lookup = resolvePersonaForMutation(pathname, auth, "modify");
	if (!lookup.success) return lookup.response;

	try {
		const body = (await req.json()) as {
			name?: string;
			description?: string | null;
			prompt?: string;
			emoji?: string;
		};

		const updated = Repository.updatePersona(lookup.id, body);
		if (!updated) {
			return errorResponse("Failed to update persona", 500);
		}

		return jsonResponse({
			success: true,
			persona: updated,
		});
	} catch (e) {
		logger.error("[Server] Error updating persona:", e);
		return errorResponse("Failed to update persona", 500);
	}
}

function handlePersonaDelete(pathname: string, auth: AuthContext): Response {
	const lookup = resolvePersonaForMutation(pathname, auth, "delete");
	if (!lookup.success) return lookup.response;

	const success = Repository.deletePersona(lookup.id);
	if (!success) {
		return errorResponse("Failed to delete persona", 500);
	}

	return jsonResponse({
		success: true,
		message: "Persona deleted successfully",
	});
}

async function handlePersonaSelect(
	req: Request,
	auth: AuthContext,
): Promise<Response> {
	const user = requireAuthUser(auth);
	if (!user) return errorResponse("Unauthorized: Valid session required", 401);

	try {
		const { chatId, personaId } = (await req.json()) as {
			chatId?: string;
			personaId?: string | null;
		};

		if (!chatId) return errorResponse("chatId is required");

		const isDM = chatId === user.id.toString();
		const isAdmin = auth.isOwner || isDM || auth.adminChatIds.includes(chatId);

		if (!isAdmin) {
			return errorResponse(
				"Forbidden: Only chat administrators can select the active persona",
				403,
			);
		}

		if (personaId && !Repository.getPersonaById(personaId)) {
			return errorResponse("Persona not found", 404);
		}

		const success = Repository.setActivePersonaForChat(
			chatId,
			personaId || null,
		);
		if (!success) return errorResponse("Failed to set active persona", 500);

		return jsonResponse({
			success: true,
			chatId,
			personaId: personaId || null,
		});
	} catch (e) {
		logger.error("[Server] Error selecting persona:", e);
		return errorResponse("Failed to select persona", 500);
	}
}

export function handlePersonaRoutes(
	pathname: string,
	req: Request,
	auth: AuthContext,
): Promise<Response> | Response | null {
	if (pathname === "/api/personas" && req.method === "GET") {
		return handlePersonasGet(auth);
	}
	if (pathname === "/api/personas" && req.method === "POST") {
		return handlePersonaCreate(req, auth);
	}
	if (pathname === "/api/personas/select" && req.method === "POST") {
		return handlePersonaSelect(req, auth);
	}
	if (pathname.startsWith("/api/personas/") && req.method === "PATCH") {
		return handlePersonaPatch(pathname, req, auth);
	}
	if (pathname.startsWith("/api/personas/") && req.method === "DELETE") {
		return handlePersonaDelete(pathname, auth);
	}
	return null;
}
