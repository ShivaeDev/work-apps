import { resolve } from "node:path";
import { parseArgs } from "node:util";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { Effect, FileSystem } from "effect";
import { prepareArchives, verifyArchives, workspaceArchives } from "#package-check/archives.ts";
import { checkConsumers } from "#package-check/consumers.ts";

const { values } = parseArgs({ options: { archives: { type: "string" }, prepare: { type: "string" } } });

const program = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;
	const root = resolve(".");
	const temporary = yield* fs.makeTempDirectoryScoped({ prefix: "work-apps-packages-" });
	const archives = resolve(values.prepare ?? values.archives ?? temporary);
	const packages = yield* workspaceArchives(root, archives);
	if (values.archives === undefined) {
		yield* prepareArchives(packages, archives);
	} else {
		yield* verifyArchives(packages, archives);
	}
	if (values.prepare === undefined) {
		yield* checkConsumers(root, packages, temporary);
	}
});
NodeRuntime.runMain(program.pipe(Effect.scoped, Effect.provide(NodeFileSystem.layer)));
