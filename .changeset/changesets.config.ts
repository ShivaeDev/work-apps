import { Effect, FileSystem } from "effect";
import { defineConfig } from "@shivaedev/releases/config.ts";
import { ChangesetError } from "@shivaedev/releases/error.ts";

const constants: Readonly<Record<string, string>> = {
	"@shivaedev/work-board": "packages/work-board/src/server/packageInfo.ts",
	"@shivaedev/work-fleet": "packages/work-fleet/src/packageInfo.ts",
};

const releaseAppHook: ReleaseHook = Effect.fn("Release.releaseAppHook")(function* ({ root, plan }) {
	const fs = yield* FileSystem.FileSystem;
	for (const release of plan.releases) {
		const constant = constants[release.name];
		if (constant === undefined) {
			continue;
		}
		const file = `${root}/${constant}`;
		const text = yield* fs.readFileString(file);
		const expected = `export const VERSION = "${release.from}";`;
		if (!text.includes(expected)) {
			return yield* new ChangesetError({ message: `${constant}: restore VERSION to ${release.from} before applying the release hook.` });
		}
		yield* fs.writeFileString(file, text.replace(expected, `export const VERSION = "${release.to}";`));
	}
});

export default defineConfig({ hooks: [releaseAppHook], packages: ["packages/*"] });
