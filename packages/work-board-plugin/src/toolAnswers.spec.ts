import { expect } from "vitest";
import {
	boardTools,
	decisionWaits,
	goalsCounted,
	nextAmongOtherRequests,
	onlyAnEarlierRequest,
	taskAuthored,
	tasksListed,
} from "#test/boardTools.ts";

const goalA = { counts: { done: 1, parked: 3 }, id: "goal.a", title: "Goal A" };
const goalB = { counts: { done: 2, running: 1, scheduled: 1 }, id: "goal.b", title: "Goal B" };

boardTools.it("board_overview counts decision.a under Needs you with its title and reason", [decisionWaits], function* ({ overviewNeedsYou }) {
	expect(yield* overviewNeedsYou()).toEqual({ count: 1, you: [{ id: "decision.a", reason: "Pick one", title: "Decide" }] });
});

boardTools.it("board_overview lists goal.a and goal.b with their tasks in each state", [goalsCounted(goalA, goalB)], function* ({ overviewGoals }) {
	expect(yield* overviewGoals()).toEqual([
		{ achieved: false, blocked: 0, done: 1, id: "goal.a", parked: 3, running: 0, scheduled: 0, standing: false, title: "Goal A", total: 4 },
		{ achieved: false, blocked: 0, done: 2, id: "goal.b", parked: 0, running: 1, scheduled: 1, standing: false, title: "Goal B", total: 4 },
	]);
});

boardTools.it("board_overview sums the done and total tasks of goal.a and goal.b", [goalsCounted(goalA, goalB)], function* ({ overviewGoalTotals }) {
	expect(yield* overviewGoalTotals()).toEqual({ done: 3, total: 8 });
});

const queue = tasksListed({
	ready: [{ file: "wire.md", goal: "goal.a", id: "task.wire", title: "Wire the tools" }],
	working: [{ file: "build.md", goal: "goal.a", id: "task.build", owner: "claude", title: "Build the pane" }],
});

boardTools.it(
	"board_overview lists task.build in progress and task.wire ready to start, each with Goal A's title",
	[goalsCounted(goalA), queue],
	function* ({ overviewTasks }) {
		expect(yield* overviewTasks()).toEqual({
			inProgress: { count: 1, tasks: [{ goal: { id: "goal.a", title: "Goal A" }, id: "task.build", owner: "claude", title: "Build the pane" }] },
			readyToStart: { count: 1, tasks: [{ goal: { id: "goal.a", title: "Goal A" }, id: "task.wire", owner: null, title: "Wire the tools" }] },
		});
	},
);

boardTools.it("board_overview says the Board needs updating when it sends no task lists", [goalsCounted(goalA)], function* ({ overviewTasks }) {
	const problem = { problem: "This Board does not list tasks to start; update it." };
	expect(yield* overviewTasks()).toEqual({ inProgress: problem, readyToStart: problem });
});

boardTools.it(
	"needs_you gives decision.a the options, prompts and recommendation of the request its link opens",
	[decisionWaits, nextAmongOtherRequests],
	function* ({ askedOf }) {
		expect(yield* askedOf("decision.a")).toEqual({ options: [{ label: "Go" }], prompts: [{ text: "Why?" }], recommended: "Go" });
	},
);

boardTools.it(
	"needs_you falls back to decision.a's own options and recommendation when no request matches its link",
	[decisionWaits, onlyAnEarlierRequest],
	function* ({ askedOf }) {
		expect(yield* askedOf("decision.a")).toEqual({ options: [{ label: "Fallback" }], prompts: [], recommended: "Fallback" });
	},
);

boardTools.it("needs_you gives decision.a an age of the 5 seconds since decide.md changed", [decisionWaits], function* ({ ageOf }) {
	expect(yield* ageOf("decision.a")).toBe("5 seconds");
});

boardTools.it("item reports task.a's authored owner, draft status, criterion and only its open decision", [taskAuthored], function* ({ authoredOf }) {
	expect(yield* authoredOf("task.a")).toEqual({
		criteria: [{ id: "proof" }],
		openDecisions: [{ id: "r", open: true }],
		owner: "codex",
		status: "draft",
	});
});
