export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFileType = "app" | "error";

export interface LogEntry {
	id: number;
	timestamp: string;
	level: string;
	message: string;
	raw: string;
}

export interface ReadLogsOptions {
	logDir: string;
	type: LogFileType;
	limit?: number;
	level?: string;
	search?: string;
}
