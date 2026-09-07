import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseClipboardOptions {
	successMessage?: string;
	timeout?: number;
}

export function useClipboard(options: UseClipboardOptions = {}) {
	const { successMessage = "Copied to clipboard!", timeout = 2000 } = options;
	const [copied, setCopied] = useState(false);

	const copy = useCallback(
		async (text: string) => {
			if (!text) return false;
			try {
				await navigator.clipboard.writeText(text);
				setCopied(true);
				if (successMessage) {
					toast.success(successMessage);
				}
				setTimeout(() => setCopied(false), timeout);
				return true;
			} catch {
				toast.error("Failed to copy to clipboard");
				return false;
			}
		},
		[successMessage, timeout],
	);

	return { copied, copy };
}
