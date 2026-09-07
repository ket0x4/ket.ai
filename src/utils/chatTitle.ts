export function isPlaceholderChatTitle(title?: string | null): boolean {
	return (
		!title ||
		title.trim() === "" ||
		title === "Whitelisted Chat" ||
		title === "Seeded Group" ||
		title.startsWith("Group (-")
	);
}

export function formatChatTitle(chatId: string, title?: string | null): string {
	if (title && !isPlaceholderChatTitle(title)) return title;
	return chatId.startsWith("-") ? `Group (${chatId})` : `Chat (${chatId})`;
}
