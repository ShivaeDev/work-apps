import { Effect, type FileSystem, type Path, type PlatformError } from "effect";
import type { MetadataDocument } from "#integration/metadata.ts";
import { type ArchiveState, archiveDocuments } from "#server/archive/documents.ts";
import { archiveSettled } from "#server/archive/settled.ts";
import type { SettledCatalogue } from "#server/archive/settledCatalogue.ts";

export interface ArchiveReads {
	readonly catalogue: Effect.Effect<SettledCatalogue, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path>;
	readonly state: Effect.Effect<ArchiveState, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path>;
}

export const archiveInventory = Effect.fn("WorkBoard.archiveInventory")(function* (
	root: string,
	documents: readonly MetadataDocument[],
	modified: ReadonlyMap<string, number>,
	now: number,
	unavailable: readonly string[],
	reads: ArchiveReads,
) {
	if (unavailable.length > 0) {
		return [];
	}
	const moved = yield* archiveDocuments(
		root,
		documents.map((document) => ({ ...document, modified: modified.get(document.file) ?? now })),
		now,
		reads.state,
	);
	return [...moved, ...(yield* archiveSettled(root, documents, reads.catalogue))];
});
