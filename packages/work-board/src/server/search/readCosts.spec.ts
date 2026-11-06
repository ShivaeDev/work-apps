import { expect } from "vitest";
import { outcomes } from "@shivaedev/test-story/server/outcomes.ts";
import { indexedAliases } from "#test/indexedAliases.ts";
import { indexedSettled } from "#test/indexedSettled.ts";
import { indexedFiles, indexStory } from "#test/indexStory.ts";

const NOTES = 100;
const nestedNotes = Object.fromEntries(Array.from({ length: NOTES }, (_, index) => [`notes/deep/item-${index}.md`, `# Item ${index}`]));

indexStory.it(
	"the first full read of 100 nested notes checks paths and directories fewer than four times per note",
	[indexedFiles(nestedNotes)],
	function* ({ pathChecks }) {
		expect(yield* pathChecks()).toBeLessThan(4 * NOTES);
	},
);

indexStory.it(
	"a full check resolves an alias that now points at another folder",
	[indexedFiles({ "first/note.md": "# First", "second/note.md": "# Second" }), indexedAliases],
	function* ({ bodyOf, editorMoves, fullCheckRuns, unavailableFiles }) {
		expect(yield* bodyOf("alias/note.md")).toBe("# First");

		yield* editorMoves("alias", "previous");
		yield* editorMoves("replacement", "alias");
		yield* fullCheckRuns();

		yield* outcomes([
			["body of alias/note.md", () => bodyOf("alias/note.md"), "# Second"],
			["unavailable files", () => unavailableFiles(), []],
		]);
	},
);

indexStory.it(
	"a reported edit reads only the edited file while the settled catalogue and archive state stand unchanged",
	[indexedFiles({ "a.md": "---\nid: a\n---\n# Alpha", "b.md": "# Beta" }), indexedSettled(["settled-one", "settled-two"])],
	function* ({ editorWrites, filesRead, settledIds, watcherReports }) {
		yield* editorWrites("a.md", "---\nid: a\n---\n# Alpha, revised");
		yield* watcherReports("a.md");

		yield* outcomes([
			["files read", () => filesRead(), ["a.md"]],
			["settled records", () => settledIds(), ["settled-one", "settled-two"]],
		]);
	},
);

indexStory.it(
	"the next reported change picks up a record another process appended to the settled catalogue",
	[indexedFiles({ "a.md": "# Alpha" }), indexedSettled(["settled-one"])],
	function* ({ anotherProcessSettles, editorWrites, settledIds, watcherReports }) {
		yield* anotherProcessSettles("settled-two");
		yield* editorWrites("a.md", "# Alpha, revised");
		yield* watcherReports("a.md");

		expect(yield* settledIds()).toEqual(["settled-one", "settled-two"]);
	},
);
