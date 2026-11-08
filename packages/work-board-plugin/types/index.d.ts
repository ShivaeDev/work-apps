export interface WorkboardAsk {
	key: string;
	title: string;
	url: string | null;
}

export interface WorkboardGoalRef {
	id: string;
	title: string;
}

export interface WorkboardTask {
	goal: WorkboardGoalRef | null;
	id: string;
	owner: string | null;
	title: string;
}

export interface WorkboardGoal {
	achieved: boolean;
	blocked: number;
	done: number;
	id: string;
	parked: number;
	running: number;
	scheduled: number;
	standing: boolean;
	title: string;
	total: number;
}

export interface WorkboardBlock<T> {
	items: T[];
	problem: string | null;
}

export type WorkboardBoard =
	| { kind: "loading" }
	| { cwd: string; kind: "none" }
	| { directory: string; kind: "down" }
	| { kind: "error"; message: string }
	| {
			asks: WorkboardBlock<WorkboardAsk>;
			goals: WorkboardBlock<WorkboardGoal>;
			kind: "ready";
			ready: WorkboardBlock<WorkboardTask>;
			working: WorkboardBlock<WorkboardTask>;
	  };

declare module "claude-code" {
	interface PluginState {
		workboard: {
			achievedOpen: boolean;
			board: Shaped<WorkboardBoard>;
			seenAsks: readonly string[] | null;
			updatedAt: number | null;
		};
	}
	interface McpToolInputs {
		"mcp__workboard__board_overview": Record<never, never>;
		"mcp__workboard__item": { id: string };
		"mcp__workboard__needs_you": Record<never, never>;
	}
}
