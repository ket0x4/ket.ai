export function getMemoryUpdateItemSchema(): Record<string, unknown> {
	return {
		type: "OBJECT",
		properties: {
			user_id: {
				type: "INTEGER",
				description:
					"The integer user_id extracted from User_ID field if available.",
			},
			user_name: {
				type: "STRING",
				description: "The first name of the user who stated the fact.",
			},
			fact: {
				type: "STRING",
				description:
					"The factual detail stated by the user. Do not use the word 'User'.",
			},
			category: {
				type: "STRING",
				description:
					"Category of fact: 'PROFILE' for permanent facts, 'DYNAMIC' for medium-term status, 'TEMPORARY' for short-lived events.",
			},
			ttl_days: {
				type: "INTEGER",
				description:
					"Days after which temporary memory expires. Leave null or 0 for permanent facts.",
			},
		},
		required: ["user_name", "fact"],
	};
}
