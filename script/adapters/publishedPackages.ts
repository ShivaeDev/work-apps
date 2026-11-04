import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Published @shivaedev packages ship their sources beside their builds under the same "source" condition this workspace
// runs its own packages with, and Node refuses to strip types under node_modules, so installed packages load their builds.
const PUBLISHED_SOURCE = /^(?<root>.*\/node_modules\/(?:@[^/]+\/)?[^/]+\/)src\/(?<module>.+)\.tsx?$/u;

registerHooks({
	resolve(specifier, context, nextResolve) {
		const resolved = nextResolve(specifier, context);
		const groups = PUBLISHED_SOURCE.exec(resolved.url)?.groups;
		if (groups === undefined) {
			return resolved;
		}
		const built = `${groups.root}dist/${groups.module}.js`;
		return existsSync(fileURLToPath(built)) ? { format: "module", shortCircuit: true, url: built } : resolved;
	},
});
