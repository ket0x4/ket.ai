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
				if (navigator.clipboard) {
					await navigator.clipboard.writeText(text);
				} else {
					// Fallback for older web views
					const textarea = document.createElement("textarea");
					textarea.value = text;
					textarea.style.position = "fixed";
					textarea.style.opacity = "0";
					document.body.appendChild(textarea);
					textarea.select();
					document.execCommand("copy");
					document.body.removeChild(textarea);
				}
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
