import fs from "node:fs";

/**
 * Appends pre-formatted lines to a file and rotates to `<path>.1` when the
 * incoming batch would exceed the configured size. Rotation is best-effort.
 */
export class RotatingFileSink {
	private bytes: number;

	constructor(
		private readonly filePath: string,
		private readonly maxBytes: number,
	) {
		this.bytes = this.safeSize();
	}

	write(lines: string[], sync: boolean): void {
		if (lines.length === 0) return;

		const data = `${lines.join("\n")}\n`;
		const incomingBytes = Buffer.byteLength(data);
		this.rotateIfNeeded(incomingBytes);
		this.bytes += incomingBytes;

		if (sync) {
			try {
				fs.appendFileSync(this.filePath, data, "utf-8");
			} catch (error) {
				console.error(
					`[Logger] Failed to write log to ${this.filePath}:`,
					error,
				);
			}
			return;
		}

		fs.appendFile(this.filePath, data, (error) => {
			if (error) {
				console.error(
					`[Logger] Failed to write log to ${this.filePath}:`,
					error,
				);
			}
		});
	}

	private rotateIfNeeded(incomingBytes: number): void {
		if (this.maxBytes <= 0) return;
		if (this.bytes + incomingBytes <= this.maxBytes) return;

		try {
			const rotated = `${this.filePath}.1`;
			fs.rmSync(rotated, { force: true });
			fs.renameSync(this.filePath, rotated);
		} catch {
			// Best-effort: if rotation fails we keep appending to the same file.
		}
		this.bytes = 0;
	}

	private safeSize(): number {
		try {
			return fs.statSync(this.filePath).size;
		} catch {
			return 0;
		}
	}
}
