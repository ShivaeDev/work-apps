import { Effect, FileSystem, Path, Schema } from "effect";
import { cachedRead } from "#server/files/cachedRead.ts";

const Record = Schema.Struct({
	file: Schema.String,
	id: Schema.String,
	item: Schema.String,
	modified: Schema.Number,
	revision: Schema.String,
	targets: Schema.Array(Schema.String),
});
const CatalogueEntry = Schema.fromJsonString(Record);
export type SettledRecord = typeof Record.Type;

export interface SettledCatalogue {
	readonly byId: ReadonlyMap<string, SettledRecord>;
	readonly files: ReadonlyMap<string, string>;
	readonly records: readonly SettledRecord[];
}

const CATALOGUE = ".board-settled/catalogue.jsonl";
const EMPTY: SettledCatalogue = { byId: new Map(), files: new Map(), records: [] };

const decodeCatalogue = Effect.fn("WorkBoard.decodeCatalogue")(function* (source: string) {
	const lines = source.split("\n").filter((line) => line.length > 0);
	const records = yield* Effect.forEach(lines, (line) => Schema.decodeUnknownEffect(CatalogueEntry)(line).pipe(Effect.orDie));
	const byId = new Map(records.map((record) => [record.id, record]));
	return { byId, files: new Map([...byId].map(([id, record]) => [id, record.file])), records: [...byId.values()] } satisfies SettledCatalogue;
});

export const readCatalogue = Effect.fn("WorkBoard.readCatalogue")(function* (root: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const file = path.join(root, CATALOGUE);
	if (!(yield* fs.exists(file))) {
		return [];
	}
	return (yield* decodeCatalogue(yield* fs.readFileString(file))).records;
});

export function catalogueReader(root: string) {
	return cachedRead(root, CATALOGUE, EMPTY, decodeCatalogue);
}

export const appendCatalogue = Effect.fn("WorkBoard.appendCatalogue")(function* (root: string, records: readonly SettledRecord[]) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const file = path.join(root, CATALOGUE);
	yield* fs.makeDirectory(path.dirname(file), { recursive: true });
	for (const record of records) {
		yield* fs.writeFileString(file, `${JSON.stringify(record)}\n`, { flag: "a" });
	}
});

export function recordPath(record: { readonly id: string }) {
	return `.board-settled/${record.id}.md`;
}
