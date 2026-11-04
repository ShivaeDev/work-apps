import { defineConfig } from "@shivaedev/quality/config.ts";

export default defineConfig({
	exceptions: [
		{
			files: ["packages/work-board-plugin/src/claude-code.d.ts"],
			reason: "TypeScript looks up the JSX namespace by that exact name to type the plugin's JSX against Claude Code's elements.",
			rules: ["biome/lint/style/useNamingConvention"],
		},
		{
			files: [
				"packages/work-board-plugin/src/adapters/hostBoard.ts",
				"packages/work-board-plugin/src/findBoard.ts",
				"packages/work-board-plugin/src/flights.tsx",
				"packages/work-board-plugin/src/goalRows.tsx",
				"packages/work-board-plugin/src/pane.tsx",
				"packages/work-board-plugin/src/register.tsx",
				"packages/work-board-plugin/src/registerTools.ts",
				"packages/work-board-plugin/src/serveTools.ts",
			],
			reason: "claude-code is the module Claude Code provides to a mod at runtime, not an npm dependency the package could declare.",
			rules: ["biome/lint/correctness/noUndeclaredDependencies"],
		},
	],
	sources: ["AGENTS.md", "README.md", "packages", "script"],
});
