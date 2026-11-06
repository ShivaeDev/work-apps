import { expect } from "vitest";
import { indexedFiles, indexStory } from "#test/indexStory.ts";

indexStory.it(
	"the index keeps the read it last built, and a rebuild after the next change frees it once the reader has let go of it",
	[indexedFiles({ "a.md": "---\nid: a\n---\n# Alpha", "b.md": "---\nid: b\n---\n# Beta" })],
	function* ({ editorWrites, readerLetsGoOfRead, readerReadsIndex, releasedReadsInMemory, watcherReports }) {
		yield* editorWrites("a.md", "---\nid: a\n---\n# First edit");
		yield* watcherReports("a.md");
		yield* readerLetsGoOfRead("the first-edit read");
		expect(yield* releasedReadsInMemory()).toEqual(["the first-edit read"]);

		yield* editorWrites("a.md", "---\nid: a\n---\n# Second edit");
		yield* watcherReports("a.md");
		yield* readerReadsIndex();

		expect(yield* releasedReadsInMemory()).toEqual([]);
	},
);
