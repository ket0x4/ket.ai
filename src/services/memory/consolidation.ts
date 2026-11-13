import { Repository } from "../../db/repository";
import logger from "../../utils/logger";
import { openAiProvider } from "../llm/openAiProvider";
import { CONSOLIDATION_CHUNK_SIZE } from "./constants";

export async function consolidateMemories(chatId: string): Promise<void> {
	const memories = Repository.getMemories(chatId);
	if (memories.length < 10) return;

	logger.info(
		`[Memory Consolidation] Analyzing ${memories.length} memories for chat ${chatId}.`,
	);

	for (
		let offset = 0;
		offset < memories.length;
		offset += CONSOLIDATION_CHUNK_SIZE
	) {
		const chunk = memories.slice(offset, offset + CONSOLIDATION_CHUNK_SIZE);
		const memoryListText = chunk
			.map((memory) => `ID: ${memory.id} | ${memory.text}`)
			.join("\n");

		const prompt = `Review the following memory list.
Find exact duplicates, resolved contradictions, or completely useless/spam facts.
Return ONLY a JSON array of the integer IDs of memories that should be permanently DELETED. Return an empty array [] if all memories are important and distinct.

Memories:
${memoryListText}`;

		try {
			const idsToDelete = await openAiProvider.generateStructured<number[]>(
				prompt,
				{
					type: "ARRAY",
					items: { type: "INTEGER" },
					description: "List of memory IDs to delete",
				},
				"You are an automated data maintenance service. Analyze stored memories and identify redundant or contradictory memory IDs for deletion. Return strictly JSON.",
			);

			if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
				Repository.deleteMemoriesByIds(idsToDelete);
				logger.info(
					`[Memory Consolidation] Deleted ${idsToDelete.length} redundant/spam memories for chat ${chatId} in chunk [${offset}-${offset + chunk.length}].`,
				);
			}
		} catch (error) {
			logger.error(`[Memory Consolidation] Error for chat ${chatId}:`, error);
		}
	}
}
