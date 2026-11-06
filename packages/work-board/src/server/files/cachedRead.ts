import { Effect, FileSystem, Option, Path } from "effect";

function version(info: FileSystem.File.Info) {
	return [info.dev, Option.getOrUndefined(info.ino), info.size, Option.getOrUndefined(Option.map(info.mtime, (date) => date.getTime()))].join(":");
}

// Every rebuild consults these bookkeeping files, so their decoded value is kept until the file's identity, size or modification time moves.
export function cachedRead<A, E, R>(root: string, name: string, missing: A, decode: (source: string) => Effect.Effect<A, E, R>) {
	let cached: { readonly value: A; readonly version: string } | undefined;
	return Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const file = (yield* Path.Path).join(root, name);
		const info = yield* fs.stat(file).pipe(
			Effect.map(Option.some),
			Effect.catchIf(
				(error) => error.reason._tag === "NotFound",
				() => Effect.succeed(Option.none<FileSystem.File.Info>()),
			),
		);
		if (Option.isNone(info)) {
			cached = undefined;
			return missing;
		}
		const current = version(info.value);
		if (cached?.version === current) {
			return cached.value;
		}
		const value = yield* decode(yield* fs.readFileString(file));
		cached = { value, version: current };
		return value;
	});
}
