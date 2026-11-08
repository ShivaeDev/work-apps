import { expect } from "vitest";
import { outcomes } from "@shivaedev/test-story/server/outcomes.ts";
import { achievedOpen, boardWithoutTaskLists, goalAnswer, goalsAnswered, onTerminal, pluginPane, tasksAnswered } from "#test/pluginPane.ts";

const shipTheBoard = goalAnswer("Ship the Board", { blocked: 3, done: 1, parked: 5, running: 2, scheduled: 4 });
const completeTasks = goalAnswer("Complete tasks", { done: 2 });
const achievedGoal = goalAnswer("Achieved goal", { done: 2 }, { achieved: true });
const anotherAchievedGoal = goalAnswer("Another achieved goal", { done: 2 }, { achieved: true });
const buildThePane = { file: "build.md", goal: shipTheBoard.id, id: "task.build", owner: "claude", title: "Build the pane" };
const wireTheTools = { file: "wire.md", goal: shipTheBoard.id, id: "task.wire", title: "Wire the tools" };
const drawTheBand = { file: "band.md", goal: shipTheBoard.id, id: "task.band", title: "Draw the band" };
const looseEnd = { file: "loose.md", id: "task.loose", title: "Tidy a loose end" };

pluginPane.it(
	"the goal legend names Done, Running, Blocked, Scheduled and Parked, each in its color",
	[goalsAnswered(shipTheBoard)],
	function* ({ legend }) {
		expect(yield* legend()).toEqual([
			{ color: "#16853f", state: "Done" },
			{ color: "#2879da", state: "Running" },
			{ color: "#d74253", state: "Blocked" },
			{ color: "#ad7400", state: "Scheduled" },
			{ color: "#808080", state: "Parked" },
		]);
	},
);

pluginPane.it(
	"on desktop, Ship the Board's bar is a drawing labelled with its count in each state",
	[goalsAnswered(shipTheBoard)],
	function* ({ goals }) {
		expect(yield* goals()).toEqual(["Ship the Board · drawn 1 of 15 done, 1 done, 2 running, 3 blocked, 4 scheduled, 5 parked · 1/15"]);
	},
);

pluginPane.it(
	"on desktop, Ship the Board's drawing fills its five states in their colors, split by four black boundaries",
	[goalsAnswered(shipTheBoard)],
	function* ({ drawing }) {
		expect(yield* drawing("Ship the Board")).toEqual({
			boundaries: ["#000000", "#000000", "#000000", "#000000"],
			segments: ["#16853f", "#2879da", "#d74253", "#ad7400", "#808080"],
		});
	},
);

pluginPane.it(
	"on a terminal, Ship the Board's bar is a ▰ run per state in its color, sized by the state's share",
	[goalsAnswered(shipTheBoard), onTerminal],
	function* ({ terminalBar }) {
		expect(yield* terminalBar("Ship the Board")).toEqual([
			{ cells: 1, color: "#16853f" },
			{ cells: 1, color: "#2879da" },
			{ cells: 3, color: "#d74253" },
			{ cells: 3, color: "#ad7400" },
			{ cells: 4, color: "#808080" },
		]);
	},
);

pluginPane.it(
	"In progress shows Build the pane under its goal Ship the Board, with its owner claude",
	[goalsAnswered(shipTheBoard), tasksAnswered("working", buildThePane)],
	function* ({ inProgress }) {
		expect(yield* inProgress()).toEqual([{ goal: "Ship the Board", tasks: ["Build the pane · claude"] }]);
	},
);

pluginPane.it(
	"Ready to start groups tasks by goal, largest group first, and lists a task with no goal under Other last",
	[goalsAnswered(shipTheBoard), tasksAnswered("ready", looseEnd, wireTheTools, drawTheBand)],
	function* ({ readyToStart }) {
		expect(yield* readyToStart()).toEqual([
			{ goal: "Ship the Board", tasks: ["Wire the tools", "Draw the band"] },
			{ goal: "Other", tasks: ["Tidy a loose end"] },
		]);
	},
);

pluginPane.it("with no task working or ready, both sections say so", [goalsAnswered(shipTheBoard)], function* ({ inProgress, readyToStart }) {
	yield* outcomes([
		["In progress", () => inProgress(), "Nothing in progress."],
		["Ready to start", () => readyToStart(), "Nothing is ready to start."],
	]);
});

pluginPane.it(
	"a Board that sends no task lists leaves both sections unknown and says to update it",
	[boardWithoutTaskLists],
	function* ({ band, readyToStart }) {
		yield* outcomes([
			["Ready to start", () => readyToStart(), "This Board does not list tasks to start; update it."],
			["band", () => band(), "Needs you 0 · In progress ? · Ready ? · Goals 0/0"],
		]);
	},
);

pluginPane.it(
	"the band counts no decisions, one task in progress, two ready and 1 of Ship the Board's 15 tasks done",
	[goalsAnswered(shipTheBoard), tasksAnswered("working", buildThePane), tasksAnswered("ready", wireTheTools, drawTheBand)],
	function* ({ band }) {
		expect(yield* band()).toBe("Needs you 0 · In progress 1 · Ready 2 · Goals 1/15");
	},
);

pluginPane.it("a goal whose tasks are all done shows ✓ all tasks done in place of a bar", [goalsAnswered(completeTasks)], function* ({ goals }) {
	expect(yield* goals()).toEqual(["Complete tasks · ✓ all tasks done · 2/2"]);
});

pluginPane.it(
	"achieved goals fold under Achieved (2), after the open goals",
	[goalsAnswered(achievedGoal, completeTasks, anotherAchievedGoal)],
	function* ({ goals }) {
		expect(yield* goals()).toEqual(["Complete tasks · ✓ all tasks done · 2/2", "▸ Achieved (2)"]);
	},
);

pluginPane.it(
	"opening Achieved (2) lists Achieved goal and Another achieved goal, each ✓ achieved",
	[goalsAnswered(achievedGoal, completeTasks, anotherAchievedGoal)],
	function* ({ click, goals }) {
		expect(yield* goals()).toEqual(["Complete tasks · ✓ all tasks done · 2/2", "▸ Achieved (2)"]);

		yield* click("Achieved (2)");

		expect(yield* goals()).toEqual([
			"Complete tasks · ✓ all tasks done · 2/2",
			"▾ Achieved (2)",
			"Achieved goal · ✓ achieved · 2/2",
			"Another achieved goal · ✓ achieved · 2/2",
		]);
	},
);

pluginPane.it(
	"✓ achieved shows in the Done color, while ✓ all tasks done stays dimmed",
	[goalsAnswered(achievedGoal, completeTasks), achievedOpen],
	function* ({ lookOf }) {
		yield* outcomes([
			["✓ achieved", () => lookOf("✓ achieved"), "#16853f"],
			["✓ all tasks done", () => lookOf("✓ all tasks done"), "dimmed"],
		]);
	},
);

pluginPane.it(
	"when Complete tasks gains a scheduled task, its ✓ all tasks done gives way to a drawing of 2 of 3 done",
	[goalsAnswered(completeTasks)],
	function* ({ goals, taskScheduledIn }) {
		expect(yield* goals()).toEqual(["Complete tasks · ✓ all tasks done · 2/2"]);

		yield* taskScheduledIn("Complete tasks");

		expect(yield* goals()).toEqual(["Complete tasks · drawn 2 of 3 done, 2 done, 0 running, 0 blocked, 1 scheduled, 0 parked · 2/3"]);
	},
);
