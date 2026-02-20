import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	plugins: [react()],
	test: {
		projects: [
			{
				test: {
					name: "unit",
					environment: "node",
					include: [
						"src/lib/__tests__/*.test.ts",
						"src/app/**/__tests__/*.test.ts",
					],
					setupFiles: ["./vitest.setup.unit.ts"],
				},
				resolve: {
					alias: {
						"@": path.resolve(__dirname, "./src"),
					},
				},
			},
			{
				test: {
					name: "components",
					environment: "happy-dom",
					include: ["src/components/__tests__/*.test.tsx"],
					setupFiles: ["./vitest.setup.ts"],
				},
				plugins: [react()],
				resolve: {
					alias: {
						"@": path.resolve(__dirname, "./src"),
					},
				},
			},
		],
	},
});
