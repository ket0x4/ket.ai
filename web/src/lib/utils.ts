import { type ClassValue, clsx } from "clsx";
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

export function formatCount(value = 0): string {
	return value.toLocaleString();
}

export function formatRelativeTime(timestamp: number): string {
	const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
	if (seconds < 60) return "now";

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;

	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;

	return new Date(timestamp * 1000).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
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

export {
	cleanMemoryText,
	getChatDisplayName,
	normalizeSearchText,
} from "./text";
