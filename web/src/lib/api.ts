declare global {
	interface Window {
		Telegram?: {
			WebApp?: {
				initData: string;
				initDataUnsafe?: {
					user?: {
						id: number;
						first_name: string;
						last_name?: string;
						username?: string;
						language_code?: string;
						is_premium?: boolean;
						photo_url?: string;
					};
				};
				ready: () => void;
				expand: () => void;
				close: () => void;
				setHeaderColor?: (color: string) => void;
				setBackgroundColor?: (color: string) => void;
				enableClosingConfirmation?: () => void;
			};
		};
	}
}

export const getTelegramWebApp = () => {
	if (typeof window !== "undefined" && window.Telegram?.WebApp) {
		return window.Telegram.WebApp;
	}
	return null;
};

const getInitData = (): string => {
	const tg = getTelegramWebApp();
	if (tg?.initData) {
		return tg.initData;
	}

	if (typeof window !== "undefined") {
		const params = new URLSearchParams(window.location.search);
		const paramInitData = params.get("initData");
		if (paramInitData) return paramInitData;

		const stored = localStorage.getItem("ket_dev_init_data");
		if (stored) return stored;
	}

	return "";
};

export async function apiFetch<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const initData = getInitData();
	const headers = new Headers(options.headers || {});

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	if (initData) {
		headers.set("x-telegram-init-data", initData);
	}

	const res = await fetch(endpoint, {
		...options,
		headers,
	});

	if (!res.ok) {
		const errorBody = await res
			.json()
			.catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
		throw new Error(errorBody.error || `HTTP ${res.status}`);
	}

	return (await res.json()) as T;
}
