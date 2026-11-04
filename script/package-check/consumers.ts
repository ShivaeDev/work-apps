import { Clock, Console, Duration, Effect, FileSystem } from "effect";
import { checkBins } from "#package-check/bins.ts";
import { checkConsumer } from "#package-check/consumer.ts";
import { command } from "#package-check/io.ts";
import { decodeVersions, type Package } from "#package-check/model.ts";
import { scenarios } from "#package-check/scenarios.ts";

export const checkConsumers = Effect.fn("Packed.checkConsumers")(function* (root: string, packages: readonly Package[], temporary: string) {
	const fs = yield* FileSystem.FileSystem;
	const catalog = decodeVersions(yield* command(root, "pnpm", ["config", "get", "catalog", "--json"]));
	const store = (yield* command(root, "pnpm", ["store", "path", "--silent"])).trim();
	for (const pkg of packages) {
		yield* Effect.gen(function* () {
			const start = yield* Clock.currentTimeNanos;
			yield* Console.log(`Checking packed ${pkg.manifest.name}`);
			const prefix = `${pkg.manifest.name.replace("/", "-")}-`;
			yield* Effect.gen(function* () {
				const consumer = yield* fs.makeTempDirectoryScoped({ directory: temporary, prefix });
				yield* checkConsumer(root, pkg, packages, catalog, consumer, store);
				yield* checkBins(root, pkg, consumer);
			}).pipe(Effect.scoped);
			for (const [index, scenario] of (yield* scenarios(root, pkg)).entries()) {
				yield* Effect.gen(function* () {
					const consumer = yield* fs.makeTempDirectoryScoped({ directory: temporary, prefix: `${prefix}${index}-` });
					yield* checkConsumer(root, pkg, packages, catalog, consumer, store, scenario);
				}).pipe(Effect.scoped);
			}
			const end = yield* Clock.currentTimeNanos;
			yield* Console.log(`Passed packed ${pkg.manifest.name} (${Math.round(Duration.toMillis(Duration.nanos(end - start)))}ms)`);
		});
	}
});
