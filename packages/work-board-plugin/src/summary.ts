import type { WorkboardBlock, WorkboardBoard, WorkboardGoal, WorkboardGoalRef, WorkboardTask } from "#types/index.d.ts";

type ReadyBoard = Extract<WorkboardBoard, { kind: "ready" }>;

export interface TaskGroup {
	goal: WorkboardGoalRef | null;
	items: WorkboardTask[];
}

export function countOf<T>(block: WorkboardBlock<T>): string {
	return block.problem === null ? String(block.items.length) : "?";
}

export function needsYou(board: ReadyBoard): number {
	return board.asks.problem === null ? board.asks.items.length : 0;
}

export function bandLine(board: ReadyBoard): string {
	const { asks, goals, ready, working } = board;
	let done = 0;
	let total = 0;
	for (const goal of goals.items) {
		done += goal.done;
		total += goal.total;
	}
	const progress = goals.problem === null ? `${done}/${total}` : "?";
	return `Needs you ${countOf(asks)} · In progress ${countOf(working)} · Ready ${countOf(ready)} · Goals ${progress}`;
}

export function goalShare(goal: WorkboardGoal): number {
	return goal.total === 0 ? 0 : Math.min(1, goal.done / goal.total);
}

function goalRank(goal: WorkboardGoal): number {
	if (goal.total === 0) {
		return 1;
	}
	return !goal.standing && goal.done >= goal.total ? 2 : 0;
}

export function goalOrder(goals: readonly WorkboardGoal[]): WorkboardGoal[] {
	return [...goals].sort((a, b) => goalRank(a) - goalRank(b) || goalShare(a) - goalShare(b));
}

export function taskGroups(tasks: readonly WorkboardTask[]): TaskGroup[] {
	const groups = new Map<string | null, TaskGroup>();
	for (const task of tasks) {
		const id = task.goal?.id ?? null;
		const group = groups.get(id) ?? { goal: task.goal, items: [] };
		group.items.push(task);
		groups.set(id, group);
	}
	const goals = [...groups.values()].filter((group) => group.goal !== null);
	goals.sort((a, b) => b.items.length - a.items.length || (a.goal?.title ?? "").localeCompare(b.goal?.title ?? ""));
	const other = groups.get(null);
	return other === undefined ? goals : [...goals, other];
}
