import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

interface AsyncActionOptions<T> {
	successMessage?: string | ((data: T) => string);
	errorMessage?: string;
	onSuccess?: (data: T) => void;
	onError?: (error: unknown) => void;
}

export function useAsyncAction() {
	const [isLoading, setIsLoading] = useState(false);

	const execute = useCallback(
		async <T>(
			actionFn: () => Promise<T>,
			options: AsyncActionOptions<T> = {},
		): Promise<T | null> => {
			try {
				setIsLoading(true);
				const result = await actionFn();

				if (options.successMessage) {
					const msg =
						typeof options.successMessage === "function"
							? options.successMessage(result)
							: options.successMessage;
					toast.success(msg);
				}

				if (options.onSuccess) {
					options.onSuccess(result);
				}

				return result;
			} catch (err: unknown) {
				const fallbackMsg = options.errorMessage || "Operation failed";
				const msg = getErrorMessage(err, fallbackMsg);
				toast.error(msg);

				if (options.onError) {
					options.onError(err);
				}

				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	return { isLoading, execute };
}
