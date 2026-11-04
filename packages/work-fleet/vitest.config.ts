import { defineConfig } from "vitest/config";
import { testProjects } from "@shivaedev/quality/adapters/testProjects.ts";

const publishedPackages = ["--import", `${import.meta.dirname}/../../script/adapters/publishedPackages.ts`];

export default defineConfig({
	resolve: { conditions: ["source", "module", "browser", "development|production"] },
	ssr: { resolve: { conditions: ["source", "node", "development|production"] } },
	test: { ...testProjects(), execArgv: [...(testProjects().execArgv ?? []), ...publishedPackages] },
});
