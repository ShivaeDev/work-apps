import type { WorkboardBlock, WorkboardGoal, WorkboardTask } from "#types/index.d.ts";
import { isRecord, records, text } from "./rpc.ts";

export type TaskList = "ready" | "working";

export function tasksOf(value: unknown, list: TaskList, titles: ReadonlyMap<string, string>): WorkboardBlock<WorkboardTask> {
	const rows = isRecord(value) ? value[list] : undefined;
	if (!Array.isArray(rows)) {
		return { items: [], problem: "This Board does not list tasks to start; update it." };
	}
	const items = records(rows).map((row) => {
		const id = text(row.id) ?? "task";
		const goal = text(row.goal);
		return {
			goal: goal === undefined ? null : { id: goal, title: titles.get(goal) ?? goal },
			id,
			owner: text(row.owner) ?? null,
			title: text(row.title) ?? id,
		};
	});
	return { items, problem: null };
}

export function goalsOf(value: unknown): WorkboardBlock<WorkboardGoal> {
	const rows = isRecord(value) ? [...records(value.goals), ...records(value.closedGoals).filter((row) => row.status === "done")] : [];
	const items = rows.map((row) => {
		const counts = isRecord(row.counts) ? row.counts : {};
		function count(state: string) {
			return typeof counts[state] === "number" ? counts[state] : 0;
		}
		const blocked = count("blocked");
		const done = count("done");
		const parked = count("parked");
		const running = count("running");
		const scheduled = count("scheduled");
		const id = text(row.id) ?? "goal";
		return {
			achieved: row.status === "done",
			blocked,
			done,
			id,
			parked,
			running,
			scheduled,
			standing: row.standing === true,
			title: text(row.title) ?? id,
			total: blocked + done + parked + running + scheduled,
		};
	});
	return { items, problem: null };
}

export function goalTitlesOf(value: unknown): Map<string, string> {
	const titles = new Map<string, string>();
	if (!isRecord(value)) {
		return titles;
	}
	for (const row of [...records(value.goals), ...records(value.deferredGoals), ...records(value.closedGoals)]) {
		const id = text(row.id);
		if (id !== undefined) {
			titles.set(id, text(row.title) ?? id);
		}
	}
	return titles;
}
