import { type ClassValue, clsx } from "clsx";
import type React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatUptime(seconds = 0): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

export function formatBytes(bytes = 0): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(timestamp: number): string {
	return new Date(timestamp * 1000).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getErrorMessage(
	err: unknown,
	fallback = "An unexpected error occurred",
): string {
	if (err instanceof Error && err.message) return err.message;
	if (typeof err === "string" && err.trim().length > 0) return err;
	return fallback;
}

export function getChatDisplayName(chat: {
	chat_id: string;
	title?: string | null;
}): string {
	const rawTitle = (chat.title || "").normalize("NFC").trim();
	if (
		rawTitle &&
		rawTitle !== "Whitelisted Chat" &&
		rawTitle !== "Seeded Group"
	) {
		return rawTitle;
	}
	return chat.chat_id.startsWith("-")
		? `Group (${chat.chat_id})`
		: `Chat (${chat.chat_id})`;
}

/**
 * Strips legacy date-time stamp and author prefix (e.g. "[21.08.2026 21:38] Ket:")
 * from memory text since created_at and user identity are already displayed separately in card view.
 */
export function cleanMemoryText(text: string): string {
	if (!text) return "";
	return text
		.replace(
			/^\[\d{1,4}[./-]\d{1,2}[./-]\d{2,4}(?:[,\s]+\d{1,2}:\d{2}(?::\d{2})?)?\]\s*(?:[^:\n]{1,50}:\s*)?/u,
			"",
		)
		.trim();
}

/**
 * Enables smooth horizontal scrolling using vertical mouse wheel delta on desktop browsers.
 */
export function handleHorizontalWheelScroll(
	e: React.WheelEvent<HTMLElement>,
): void {
	if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
		e.currentTarget.scrollLeft += e.deltaY;
	}
}

/**
 * Normalizes text for accent-insensitive and locale-aware search matching.
 */
export function normalizeSearchText(text: string): string {
	return (text || "")
		.toLocaleLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}
