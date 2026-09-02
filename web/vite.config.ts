import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		outDir: "../public",
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules")) {
						if (id.includes("lucide-react")) {
							return "vendor-icons";
						}
						if (id.includes("@radix-ui")) {
							return "vendor-radix";
						}
						if (
							id.includes("clsx") ||
							id.includes("tailwind-merge") ||
							id.includes("class-variance-authority") ||
							id.includes("sonner")
						) {
							return "vendor-utils";
						}
						if (
							id.includes("react") ||
							id.includes("react-dom") ||
							id.includes("scheduler")
						) {
							return "vendor-react";
						}
					}
				},
			},
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
});
