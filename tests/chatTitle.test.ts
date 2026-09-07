import { describe, expect, test } from "bun:test";
import {
	formatChatTitle,
	isPlaceholderChatTitle,
} from "../src/utils/chatTitle";

describe("chat title formatting", () => {
	test("recognizes legacy and generated placeholder titles", () => {
		expect(isPlaceholderChatTitle(null)).toBeTrue();
		expect(isPlaceholderChatTitle("Whitelisted Chat")).toBeTrue();
		expect(isPlaceholderChatTitle("Seeded Group")).toBeTrue();
		expect(isPlaceholderChatTitle("Group (-100123)")).toBeTrue();
		expect(isPlaceholderChatTitle("Actual group name")).toBeFalse();
	});

	test("formats fallback titles consistently for groups and private chats", () => {
		expect(formatChatTitle("-100123", "Seeded Group")).toBe("Group (-100123)");
		expect(formatChatTitle("12345", null)).toBe("Chat (12345)");
		expect(formatChatTitle("-100123", "Actual group name")).toBe(
			"Actual group name",
		);
	});
});
