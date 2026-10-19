import type { AuthContext, TelegramUser } from "../../../web/src/types";
import { Repository } from "../../db/repository";
import { DEFAULT_PERSONA_ID } from "../../db/repository/personas";
import logger from "../../utils/logger";
import { errorResponse, jsonResponse } from "../http";

function handlePersonasGet(auth: AuthContext): Response {
	try {
		const personas = Repository.getAllPersonas();
		const activePersonas = auth.isOwner
			? Repository.getActivePersonasMap()
			: Repository.getActivePersonasMap(
					new Set([
						...(auth.user ? [auth.user.id.toString()] : []),
						...auth.adminChatIds,
						...auth.memberChatIds,
					]),
				);

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

	const id = pathname.slice("/api/personas/".length).trim();
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
		};

		if (body.name !== undefined && !body.name.trim()) {
			return errorResponse("Persona name cannot be empty");
		}
		if (body.prompt !== undefined && !body.prompt.trim()) {
			return errorResponse("Persona prompt cannot be empty");
		}

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

		const normalizedId =
			personaId && personaId !== DEFAULT_PERSONA_ID ? personaId : null;

		if (normalizedId && !Repository.getPersonaById(normalizedId)) {
			return errorResponse("Persona not found", 404);
		}

		const success = Repository.setActivePersonaForChat(chatId, normalizedId);
		if (!success) return errorResponse("Failed to set active persona", 500);

		return jsonResponse({
			success: true,
			chatId,
			personaId: normalizedId,
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
	if (pathname === "/api/personas") {
		if (req.method === "GET") return handlePersonasGet(auth);
		if (req.method === "POST") return handlePersonaCreate(req, auth);
		return null;
	}
	if (pathname === "/api/personas/select" && req.method === "POST") {
		return handlePersonaSelect(req, auth);
	}
	if (pathname.startsWith("/api/personas/")) {
		if (req.method === "PATCH") return handlePersonaPatch(pathname, req, auth);
		if (req.method === "DELETE") return handlePersonaDelete(pathname, auth);
	}
	return null;
}
