// Global per-chat lock to prevent concurrency race conditions when generating replies
const chatLocks = new Map<string, Promise<void>>();

export async function withChatLock<T>(
	chatId: string,
	fn: () => Promise<T>,
): Promise<T> {
	const currentLock = chatLocks.get(chatId) || Promise.resolve();

	let releaseLock!: () => void;
	const newLock = new Promise<void>((resolve) => {
		releaseLock = resolve;
	});

	chatLocks.set(
		chatId,
		currentLock.then(
			() => newLock,
			() => newLock,
		),
	);

	try {
		await currentLock;
		return await fn();
	} finally {
		releaseLock();
		if (chatLocks.get(chatId) === newLock) {
			chatLocks.delete(chatId);
		}
	}
}
