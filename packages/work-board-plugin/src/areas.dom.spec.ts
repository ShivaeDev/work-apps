import { expect } from "vitest";
import { outcomes } from "@shivaedev/test-story/server/outcomes.ts";
import { areasAnswered, paneColumns, pluginPane } from "#test/pluginPane.ts";

const holder = { prUrl: "https://github.com/example/project/pull/42", stage: "reviewing", workId: "Build Fleet" };
const queue = ["First", "Second", "Third", "Fourth", "Fifth"].map((workId) => ({ prUrl: null, stage: "queued", workId }));
const availability = areasAnswered([
	{ area: ".pnpm-store", holders: [], queue: [] },
	{ area: "work-board", holders: [], queue: queue.slice(0, 1) },
	{ area: "work-fleet", holders: [holder], queue },
	{ area: "work-github", holders: [holder], queue: [] },
	{ area: "free", holders: [], queue: [] },
]);

pluginPane.it(
	"area chips show only held and queued areas, held areas first, and tell a long queue from a short one",
	[availability, paneColumns(32)],
	function* ({ areaChips, areaState, click, areaDetails }) {
		yield* outcomes([
			["Chips", () => areaChips(), ["work-fleet", "work-github", "work-board"]],
			["Held area", () => areaState("work-fleet"), { color: "#d74253", state: "held · 5 queued" }],
			["Short queue", () => areaState("work-board"), { color: "#ad7400", state: "unheld · 1 queued" }],
		]);
		yield* click("work-fleet");
		expect(yield* areaDetails()).toEqual([
			"work-fleet",
			"Holds Build Fleet · reviewing #42",
			"1. First · queued",
			"2. Second · queued",
			"3. Third · queued",
			"4. Fourth · queued",
			"5. Fifth · queued",
		]);
		yield* click("work-board");
		expect(yield* areaDetails()).toEqual(["work-board", "No holder", "1. First · queued"]);
		yield* click("work-board");
		expect(yield* areaDetails()).toEqual([]);
	},
);

pluginPane.it(
	"a Fleet whose areas are all free shows that no area is held or queued",
	[areasAnswered([{ area: "free", holders: [], queue: [] }])],
	function* ({ areaChips, lookOf }) {
		yield* outcomes([
			["Chips", () => areaChips(), []],
			["Notice", () => lookOf("No area is held or queued."), "dimmed"],
		]);
	},
);

pluginPane.it("an older Fleet reply leaves area availability unknown", [], function* ({ lookOf }) {
	expect(yield* lookOf("This Fleet has not supplied area availability.")).toBe("dimmed");
});
