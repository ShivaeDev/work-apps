import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { readBoard } from "#board.ts";
import { type PaneView, paneView } from "#pane.tsx";
import { bandLine } from "#summary.ts";
import { installPaneJsx, paneElements, reactPane } from "#test/paneElements.ts";
import { drawingOf, goalLines, legendShown, lookOf, tasksShown, terminalBarOf } from "#test/paneReadouts.ts";
import { reply, success } from "#test/rpcReplies.ts";
import type { WorkboardBoard } from "#types/index.d.ts";

type RenderSurface = PaneView["surface"];

Object.assign(globalThis, { "IS_REACT_ACT_ENVIRONMENT": true });

export const createPane = Effect.fnUntraced(function* () {
	installPaneJsx();
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	yield* Effect.addFinalizer(() =>
		Effect.promise(async () => {
			await act(() => root.unmount());
			container.remove();
			Reflect.deleteProperty(globalThis, "h");
		}),
	);
	const view: PaneView = {
		achievedOpen: false,
		board: { kind: "loading" },
		columns: 80,
		onOpen: () => undefined,
		onRefresh: () => undefined,
		onToggleAchieved: () => {
			view.achievedOpen = !view.achievedOpen;
			draw();
		},
		surface: "desktop",
		updated: "just now",
	};
	function draw() {
		root.render(reactPane(paneView(paneElements, view)));
	}
	return {
		container,
		render: (board: WorkboardBoard, surface: RenderSurface = "desktop") =>
			Effect.promise(async () => {
				Object.assign(view, { board, surface });
				await act(draw);
			}),
		view,
	};
});

export interface GoalAnswer {
	readonly counts: Readonly<Record<string, number>>;
	readonly id: string;
	readonly status?: "done";
	readonly title: string;
}

export function goalAnswer(title: string, counts: Readonly<Record<string, number>>, { achieved = false } = {}): GoalAnswer {
	const id = `goal.${title.toLowerCase().replaceAll(" ", "-")}`;
	return achieved ? { counts, id, status: "done", title } : { counts, id, title };
}

function boardFrom(engine: PaneEngine): WorkboardBoard {
	const goals = engine.goals.filter((goal) => goal.status !== "done");
	const closedGoals = engine.goals.filter((goal) => goal.status === "done");
	return readBoard(reply(success("1", { you: [] }), success("2", { goals: { closedGoals, goals }, tasks: engine.tasks })), "/repo");
}

export interface TaskAnswer {
	readonly file: string;
	readonly goal?: string;
	readonly id: string;
	readonly owner?: string;
	readonly title: string;
}

type TaskList = "ready" | "working";

interface PaneEngine {
	board: WorkboardBoard;
	goals: GoalAnswer[];
	readonly pane: Effect.Success<ReturnType<typeof createPane>>;
	surface: RenderSurface;
	tasks: Record<TaskList, TaskAnswer[]> | undefined;
}

function show(engine: PaneEngine) {
	engine.board = boardFrom(engine);
	return engine.pane.render(engine.board, engine.surface);
}

export const pluginPane = storyKit({
	after: { board: show },
	create: () =>
		Effect.map(
			createPane(),
			(pane): PaneEngine => ({ board: { kind: "loading" }, goals: [], pane, surface: "desktop", tasks: { ready: [], working: [] } }),
		),
	name: "Claude plugin pane",
	stages: ["board"],
	verbs: (engine, story) => {
		const { container } = engine.pane;
		return {
			band: () =>
				Effect.sync(() => {
					story.tell("read the band line for the same answers");
					return engine.board.kind === "ready" ? bandLine(engine.board) : engine.board.kind;
				}),
			click: (label: string) =>
				Effect.promise(async () => {
					story.tell(`click ${label}`);
					const button = [...container.querySelectorAll("button")].find((node) => node.textContent?.includes(label));
					if (!button) {
						throw new Error(`The pane has no ${label} button`);
					}
					await act(() => button.click());
				}),
			drawing: (title: string) =>
				Effect.sync(() => {
					story.tell(`read the drawing of ${title}'s bar`);
					return drawingOf(container, title);
				}),
			goals: () =>
				Effect.sync(() => {
					story.tell("read the Goals section");
					return goalLines(container);
				}),
			inProgress: () =>
				Effect.sync(() => {
					story.tell("read the In progress section");
					return tasksShown(container, "In progress");
				}),
			legend: () =>
				Effect.sync(() => {
					story.tell("read the goal legend");
					return legendShown(container);
				}),
			lookOf: (text: string) =>
				Effect.sync(() => {
					story.tell(`read how ${text} looks`);
					return lookOf(container, text);
				}),
			readyToStart: () =>
				Effect.sync(() => {
					story.tell("read the Ready to start section");
					return tasksShown(container, "Ready to start");
				}),
			taskScheduledIn: (title: string) =>
				Effect.suspend(() => {
					story.tell(`a task is scheduled in ${title} and the Board answers again`);
					const goal = engine.goals.find((candidate) => candidate.title === title);
					if (!goal) {
						throw new Error(`The Board has no goal ${title}`);
					}
					engine.goals = engine.goals.map((candidate) =>
						candidate === goal ? { ...goal, counts: { ...goal.counts, scheduled: (goal.counts.scheduled ?? 0) + 1 } } : candidate,
					);
					return show(engine);
				}),
			terminalBar: (title: string) =>
				Effect.sync(() => {
					story.tell(`read ${title}'s bar of ▰ runs`);
					return terminalBarOf(container, title);
				}),
		};
	},
});

export function goalsAnswered(...goals: readonly GoalAnswer[]) {
	return pluginPane.trait("board", `the Board answers with the goals ${goals.map((goal) => goal.title).join(", ")}`, (engine) => {
		engine.goals.push(...goals);
	});
}

export function tasksAnswered(list: TaskList, ...tasks: readonly TaskAnswer[]) {
	const where = list === "ready" ? "ready to start" : "in progress";
	return pluginPane.trait("board", `the Board lists ${tasks.map((task) => task.title).join(", ")} ${where}`, (engine) => {
		engine.tasks?.[list].push(...tasks);
	});
}

export const boardWithoutTaskLists = pluginPane.trait("board", "the Board answers without task lists, as Boards before them did", (engine) => {
	engine.tasks = undefined;
});

export const onTerminal = pluginPane.trait("board", "the pane draws on a terminal", (engine) => {
	engine.surface = "terminal";
});

export const achievedOpen = pluginPane.trait("board", "the Achieved list is already open", (engine) => {
	engine.pane.view.achievedOpen = true;
});

export function paneColumns(columns: number) {
	return pluginPane.trait("board", `the pane is ${columns} columns wide`, (engine) => {
		engine.pane.view.columns = columns;
	});
}
