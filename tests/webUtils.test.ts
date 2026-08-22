import { expect, test } from "bun:test";
import {
	cleanMemoryText,
	getChatDisplayName,
	normalizeSearchText,
} from "../web/src/lib/utils";

test("cleanMemoryText strips date, time, and author prefixes", () => {
	expect(
		cleanMemoryText("[21.08.2026 21:38] Ket: John is a software engineer"),
	).toBe("John is a software engineer");

	expect(cleanMemoryText("[21.08.2026 21:38] John works at Google")).toBe(
		"John works at Google",
	);

	expect(
		cleanMemoryText("[2026-08-21 21:38:00] Alice: Works remotely from Berlin"),
	).toBe("Works remotely from Berlin");

	expect(cleanMemoryText("Plain text without timestamp")).toBe(
		"Plain text without timestamp",
	);

	expect(cleanMemoryText("")).toBe("");
});

test("getChatDisplayName handles non-ASCII and fallback chat titles", () => {
	expect(
		getChatDisplayName({
			chat_id: "-100123456789",
			title: "🚀 Türkçe & Cyrillic Grup (Çözüm 123)",
		}),
	).toBe("🚀 Türkçe & Cyrillic Grup (Çözüm 123)");

	expect(
		getChatDisplayName({
			chat_id: "-100123456789",
			title: "   ",
		}),
	).toBe("Group (-100123456789)");

	expect(
		getChatDisplayName({
			chat_id: "987654321",
			title: "Whitelisted Chat",
		}),
	).toBe("Chat (987654321)");
});

test("normalizeSearchText provides accent and case normalization", () => {
	expect(normalizeSearchText("İstanbul")).toBe("istanbul");
	expect(normalizeSearchText("ÇÖZÜM")).toBe("cozum");
	expect(normalizeSearchText("  Grup Arama  ")).toBe("grup arama");
});
