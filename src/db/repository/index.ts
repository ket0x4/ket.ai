import { chatMethods } from "./chats";
import { memoryMethods } from "./memories";
import { messageMethods } from "./messages";
import { personaMethods } from "./personas";
import type { RepositorySelf } from "./types";
import { userMethods } from "./users";

export type { MemoryItem, MessageRow } from "./types";

export const Repository: typeof userMethods &
	typeof chatMethods &
	typeof messageMethods &
	typeof memoryMethods &
	typeof personaMethods = {
	...userMethods,
	...chatMethods,
	...messageMethods,
	...memoryMethods,
	...personaMethods,
};

// Compile-time guard: the assembled object must expose every method that domain
// modules delegate to via `this`, so cross-module calls stay type-checked.
const _repositorySelfGuard: RepositorySelf = Repository;
void _repositorySelfGuard;
