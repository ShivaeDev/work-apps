import { describe, expect, it } from "vitest";
import { goalsOf, goalTitlesOf, tasksOf } from "#answers.ts";

describe("task lists and goals", () => {
	it("names each listed task's goal by its title, from open, deferred or closed goals", () => {
		const titles = goalTitlesOf({
			closedGoals: [{ id: "goal.closed", title: "Closed goal" }],
			deferredGoals: [{ id: "goal.parked", title: "Parked goal" }],
			goals: [{ id: "project.open" }],
		});
		const tasks = {
			ready: [
				{ file: "a.md", goal: "goal.parked", id: "task.a", owner: "claude", title: "Linked" },
				{ file: "b.md", goal: "goal.unknown", id: "task.b" },
				{ file: "c.md", id: "task.c", title: "Loose" },
			],
			working: [],
		};
		expect(tasksOf(tasks, "ready", titles)).toEqual({
			items: [
				{ goal: { id: "goal.parked", title: "Parked goal" }, id: "task.a", owner: "claude", title: "Linked" },
				{ goal: { id: "goal.unknown", title: "goal.unknown" }, id: "task.b", owner: null, title: "task.b" },
				{ goal: null, id: "task.c", owner: null, title: "Loose" },
			],
			problem: null,
		});
		expect(tasksOf(tasks, "working", titles)).toEqual({ items: [], problem: null });
	});

	it("says the Board needs updating when it sends no task lists", () => {
		expect(tasksOf(undefined, "ready", new Map()).problem).toBe("This Board does not list tasks to start; update it.");
	});

	it("keeps the five progress states and standing-home flag from the Board", () => {
		expect(
			goalsOf({ goals: [{ counts: { achieved: false, blocked: 4, done: 2, parked: 5, running: 3, scheduled: 1 }, id: "goal.a", standing: true }] })
				.items,
		).toEqual([
			{ achieved: false, blocked: 4, done: 2, id: "goal.a", parked: 5, running: 3, scheduled: 1, standing: true, title: "goal.a", total: 15 },
		]);
	});
});
