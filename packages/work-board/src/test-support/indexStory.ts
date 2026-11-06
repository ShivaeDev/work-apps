import { appendFileSync, existsSync, renameSync, statSync, unlinkSync, utimesSync } from "node:fs";
import { join, relative } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { NodeServices } from "@effect/platform-node";
import { Effect, Order, Ref } from "effect";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { inboxItems } from "#server/attention/inbox.ts";
import { searchMatch } from "#server/search/match.ts";
import { type Snapshot, searchSnapshot } from "#server/search/snapshot.ts";
import { type Folder, folder } from "./board.ts";
import { collectGarbage } from "./collectGarbage.ts";
import { incrementalIndex } from "./incrementalIndex.ts";
import { comparable, kept } from "./indexComparison.ts";
import { indexState } from "./indexState.ts";
import { SETTLED_CATALOGUE, settledLine } from "./settledCatalogue.ts";

interface IndexEngine {
	addDuringListing: boolean;
	before?: Snapshot;
	home?: string;
	index?: Effect.Success<ReturnType<typeof incrementalIndex>>;
	lastRead?: Snapshot;
	notes: Folder;
	read?: Effect.Success<ReturnType<typeof searchSnapshot>>;
	readonly released: Map<string, WeakRef<Snapshot>>;
	unreadable?: string;
}

function indexed(engine: IndexEngine) {
	if (!(engine.index && engine.read)) {
		throw new Error("The board index has not started");
	}
	return { index: engine.index, read: engine.read };
}

function advancingListing(engine: IndexEngine, index: Effect.Success<ReturnType<typeof incrementalIndex>>) {
	const addFile = Effect.suspend(() => {
		if (!engine.addDuringListing) {
			return Effect.void;
		}
		engine.addDuringListing = false;
		engine.notes.write("added.md", "---\nid: added\n---\n# Added");
		return index.update(["added.md"]);
	});
	return { ...index.changes, inventory: index.changes.inventory.pipe(Effect.tap(() => addFile)) };
}

export const indexStory = storyKit({
	after: {
		*project(engine) {
			const index = yield* incrementalIndex(engine.notes.root, engine.home);
			engine.index = index;
			if (engine.addDuringListing) {
				engine.read = yield* searchSnapshot(engine.notes.root, engine.home, advancingListing(engine, index));
				return;
			}
			engine.read = index.read();
			engine.before = yield* engine.read;
			if (engine.unreadable) {
				index.blocked.add(join(engine.notes.root, engine.unreadable));
				yield* index.update([engine.unreadable]);
				yield* engine.read;
			}
			index.reads.length = 0;
		},
	},
	clock: "live",
	*create() {
		const notes = yield* Effect.acquireRelease(
			Effect.sync(() => folder({})),
			(acquired) => Effect.sync(acquired.remove),
		);
		const engine: IndexEngine = { addDuringListing: false, notes, released: new Map() };
		return engine;
	},
	inspect: (engine) => ({ blocked: [...(engine.index?.blocked ?? [])], reads: engine.index?.reads, root: engine.notes.root }),
	layer: NodeServices.layer,
	name: "board index",
	stages: ["project"],
	verbs: (engine, story) => {
		function current() {
			return indexed(engine).read;
		}
		function before() {
			if (!engine.before) {
				throw new Error("The story has no index read from before its action");
			}
			return engine.before;
		}
		return {
			anotherProcessSettles: (id: string) =>
				Effect.sync(() => {
					story.tell(`another process records ${id} in the settled catalogue`);
					appendFileSync(join(engine.notes.root, SETTLED_CATALOGUE), settledLine(id));
				}),
			bodyOf: (file: string) =>
				Effect.map(current(), (snapshot) => {
					story.tell(`the reader reads the indexed body of ${file}`);
					return snapshot.documents.find((document) => document.file === file)?.parsed.body ?? "not indexed";
				}),
			editorAdds: (file: string, source: string) =>
				Effect.sync(() => {
					story.tell(`an editor adds ${file}`);
					engine.notes.write(file, source);
				}),
			editorMoves: (from: string, to: string) =>
				Effect.sync(() => {
					story.tell(`an editor moves ${from} to ${to}`);
					renameSync(join(engine.notes.root, from), join(engine.notes.root, to));
				}),
			editorMovesFolderIfPresent: (from: string, to: string) =>
				Effect.sync(() => {
					story.tell(`an editor moves the folder ${from} to ${to} when it exists`);
					if (existsSync(join(engine.notes.root, from))) {
						renameSync(join(engine.notes.root, from), join(engine.notes.root, to));
					}
				}),
			editorRemoves: (file: string) =>
				Effect.sync(() => {
					story.tell(`an editor removes ${file}`);
					unlinkSync(join(engine.notes.root, file));
				}),
			editorStamps: (file: string, seconds: number) =>
				Effect.sync(() => {
					story.tell(`an editor sets the modification time of ${file} to ${seconds} seconds without changing its bytes`);
					utimesSync(join(engine.notes.root, file), seconds, seconds);
				}),
			editorWrites: (file: string, source: string) =>
				Effect.sync(() => {
					story.tell(`an editor writes ${file}`);
					engine.notes.write(file, source);
				}),
			editorWritesAt: (file: string, source: string, seconds: number) =>
				Effect.sync(() => {
					story.tell(`an editor writes ${file} with the modification time ${seconds} seconds`);
					engine.notes.write(file, source);
					utimesSync(join(engine.notes.root, file), seconds, seconds);
				}),
			editorWritesKeepingTimestamp: (file: string, source: string) =>
				Effect.sync(() => {
					story.tell(`an editor writes ${file} and restores its old timestamp`);
					const path = join(engine.notes.root, file);
					const { atime, mtime } = statSync(path);
					engine.notes.write(file, source);
					utimesSync(path, atime, mtime);
				}),
			filesRead: () =>
				Effect.map(current(), () => {
					story.tell("the reader reads the index and checks which files it read since the last change it received");
					return indexed(engine).index.reads.map((path) => relative(engine.notes.root, path));
				}),
			fullCheckRuns: () => {
				story.tell("the index reconciles the whole folder");
				return indexed(engine).index.update();
			},
			inboxOrder: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads the Inbox order");
					return inboxItems(snapshot).map((item) => item.id);
				}),
			indexDifferences: () =>
				Effect.gen(function* () {
					story.tell("an independent full scan reads the same files and the reader compares it with the index");
					const incremental = indexState(yield* current());
					const { reads } = indexed(engine).index;
					const readBefore = [...reads];
					const fresh = indexState(yield* indexed(engine).index.fresh());
					reads.splice(0, reads.length, ...readBefore);
					const incrementalEntries = new Map(Object.entries(incremental));
					return Object.entries(fresh)
						.filter(([key, value]) => !isDeepStrictEqual(comparable(incrementalEntries.get(key)), comparable(value)))
						.map(([key]) => key);
				}),
			indexedIds: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads the indexed identities");
					return [...snapshot.model.ids.keys()].sort(Order.String);
				}),
			indexedPaths: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads the indexed paths");
					return snapshot.documents.map((document) => document.file).sort(Order.String);
				}),
			keptDocuments: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader checks which documents the index kept from before without parsing them again");
					return kept(before(), snapshot);
				}),
			laterReadReuses: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads the index again and compares it with the earlier read");
					return snapshot === engine.lastRead ? "the same snapshot" : "a rebuilt snapshot";
				}),
			modifiedAt: (file: string) =>
				Effect.map(current(), (snapshot) => {
					story.tell(`the reader reads the indexed modification time of ${file}`);
					return snapshot.documents.find((document) => document.file === file)?.modified;
				}),
			pathChecks: () =>
				Effect.gen(function* () {
					yield* current();
					story.tell("the reader counts the path and directory checks of the read");
					return indexed(engine).index.checks();
				}),
			readerLetsGoOfRead: (name: string) => {
				// Told before the read: the story's call sites would otherwise keep the read in memory.
				story.tell(`the reader reads the index as ${name} and lets go of that read`);
				return Effect.map(current(), (snapshot) => {
					engine.released.set(name, new WeakRef(snapshot));
				});
			},
			readerReadsIndex: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads the index");
					engine.lastRead = snapshot;
				}),
			readingDenied: (file: string) =>
				Effect.sync(() => {
					story.tell(`reading ${file} is denied`);
					indexed(engine).index.blocked.add(join(engine.notes.root, file));
				}),
			readingRecovers: () =>
				Effect.sync(() => {
					story.tell("file permissions recover");
					indexed(engine).index.blocked.clear();
					indexed(engine).index.reads.length = 0;
				}),
			releasedReadsInMemory: () =>
				Effect.gen(function* () {
					story.tell("garbage collection runs and the reader lists the reads it let go of that are still in memory");
					yield* collectGarbage;
					return [...engine.released].filter(([, read]) => read.deref() !== undefined).map(([name]) => name);
				}),
			revisionOfRead: () =>
				Effect.gen(function* () {
					story.tell("the reader compares the read's revision with the index's current revision");
					const snapshot = yield* current();
					return snapshot.revision === (yield* indexed(engine).index.changes.revision) ? "current" : "behind";
				}),
			searchOrder: (query: string) =>
				Effect.map(current(), (snapshot) => {
					story.tell(`the reader searches the index for ${JSON.stringify(query)}`);
					return searchMatch(snapshot.entries, query, snapshot.modified).results.map((entry) => entry.id);
				}),
			searchTitle: (query: string, id: string) =>
				Effect.map(current(), (snapshot) => {
					story.tell(`the reader searches the index for ${JSON.stringify(query)} and reads the title of ${id}`);
					return searchMatch(snapshot.entries, query).results.find((entry) => entry.id === id)?.title ?? "not found";
				}),
			settledIds: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads which settled records the index knows");
					return [...(snapshot.model.settled?.keys() ?? [])].sort(Order.String);
				}),
			unavailableFiles: () =>
				Effect.map(current(), (snapshot) => {
					story.tell("the reader reads which files the index could not read");
					return snapshot.unavailable;
				}),
			watcherReports: (...paths: readonly string[]) => {
				story.tell(`the index receives changes for ${paths.join(", ")}`);
				return indexed(engine).index.update(paths);
			},
			watcherStops: () => {
				story.tell("the filesystem watcher is unavailable");
				return Ref.set(indexed(engine).index.changes.watching, false);
			},
		};
	},
});

export function indexedFiles(files: Readonly<Record<string, string>>, modified: ReadonlyMap<string, number> = new Map()) {
	return indexStory.trait("project", `the board indexes ${Object.keys(files).join(", ")}`, (engine) => {
		for (const [file, source] of Object.entries(files)) {
			engine.notes.write(file, source);
		}
		for (const [file, time] of modified) {
			utimesSync(join(engine.notes.root, file), time / 1000, time / 1000);
		}
	});
}

export function aFileAddedDuringListing() {
	return indexStory.trait("project", "a new file arrives during the first listing, before the reader has read the index", (engine) => {
		engine.addDuringListing = true;
	});
}

export function unreadableAfterReport(file: string) {
	return indexStory.trait("project", `${file} cannot be read when the index next reads it after a reported change`, (engine) => {
		engine.unreadable = file;
	});
}
