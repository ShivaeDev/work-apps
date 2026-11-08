import type { WorkboardGoal, WorkboardTask } from "#types/index.d.ts";

export function goal(id: string, done: number, running: number, total: number): WorkboardGoal {
	return {
		achieved: false,
		blocked: 0,
		done,
		id,
		parked: total - done - running,
		running,
		scheduled: 0,
		standing: false,
		title: id.replace("goal.", ""),
		total,
	};
}

export function task(id: string): WorkboardTask {
	return { goal: null, id, owner: null, title: id };
}
