import { expect } from "vitest";
import { outcomes } from "@shivaedev/test-story/server/outcomes.ts";
import { boardStory, projectFiles } from "#test/boardStory.ts";
import { goalProgressFixture, progressFleet } from "#test/goalProgressFixture.ts";
import { launchFiles } from "#test/launchFiles.ts";
import { fleetReports } from "#test/storyTraits.ts";

const aLaunch = projectFiles(launchFiles, "a launch goal has done, working, startable, blocked and held tasks and an open decision");

const launch = { id: "project.launch", title: "Launch" };

boardStory.it(
	"the plugin's board read shows the open decision, the working task, the one task ready to start and the launch goal's progress",
	[aLaunch],
	function* ({ boardUrl, pluginSection }) {
		yield* outcomes([
			[
				"asks",
				() => pluginSection("asks"),
				{
					items: [{ key: "open:task.asked", title: "Pick the scope", url: boardUrl("/_board/item/decision.scope/#answer-card-direction") }],
					problem: null,
				},
			],
			[
				"working",
				() => pluginSection("working"),
				{ items: [{ goal: launch, id: "task.build", owner: "claude", title: "Build the page" }], problem: null },
			],
			["ready", () => pluginSection("ready"), { items: [{ goal: launch, id: "task.wire", owner: "claude", title: "Wire the form" }], problem: null }],
			[
				"goals",
				() => pluginSection("goals"),
				{
					items: [
						{
							achieved: false,
							blocked: 1,
							done: 1,
							id: "project.launch",
							parked: 1,
							running: 1,
							scheduled: 2,
							standing: false,
							title: "Launch",
							total: 6,
						},
					],
					problem: null,
				},
			],
		]);
	},
);

boardStory.it(
	"the plugin's overview tool counts the waiting decision, the working task, the task ready to start and the goal's progress",
	[aLaunch],
	function* ({ pluginOverview }) {
		expect(yield* pluginOverview()).toMatchObject({
			goals: { done: 1, total: 6 },
			inProgress: { count: 1, tasks: [{ id: "task.build" }] },
			needsYou: { count: 1, you: [{ id: "task.asked", reason: "Choose the launch scope", title: "Pick the scope" }] },
			readyToStart: { count: 1, tasks: [{ id: "task.wire" }] },
		});
	},
);

boardStory.it("the plugin's needs-you tool offers the decision's options and recommendation", [aLaunch], function* ({ pluginNeedsYou }) {
	expect((yield* pluginNeedsYou()).you).toEqual([
		expect.objectContaining({
			id: "task.asked",
			options: [expect.objectContaining({ label: "Ship" }), expect.objectContaining({ label: "Wait" })],
			recommended: "Ship",
		}),
	]);
});

boardStory.it("the plugin's item tool reads the working build's criteria, relationships and status", [aLaunch], function* ({ pluginItem }) {
	expect(yield* pluginItem("task.build")).toEqual({
		criteria: [{ id: "proof", text: "Show the page" }],
		id: "task.build",
		openDecisions: [],
		owner: "claude",
		relationships: [{ kind: "implements", target: "project.launch#page" }],
		status: "working",
	});
});

boardStory.it(
	"the plugin's board read carries every progress state and standing goals",
	[projectFiles(goalProgressFixture()), fleetReports(progressFleet())],
	function* ({ pluginGoal }) {
		yield* outcomes([
			[
				"progress",
				() => pluginGoal("goal.progress"),
				{
					achieved: false,
					blocked: 4,
					done: 1,
					id: "goal.progress",
					parked: 5,
					running: 2,
					scheduled: 2,
					standing: false,
					title: "goal.progress",
					total: 14,
				},
			],
			["standing", () => pluginGoal("goal.standing"), expect.objectContaining({ done: 1, standing: true, total: 1 })],
		]);
	},
);
