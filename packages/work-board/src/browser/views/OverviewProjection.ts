import { Schema, Struct } from "effect";
import { FleetItemsProjection } from "./FleetItemsProjection.ts";
import { GoalsProjection } from "./GoalsProjection.ts";

const TaskRow = Schema.Struct({
	file: Schema.String,
	goal: Schema.optionalKey(Schema.String),
	id: Schema.String,
	owner: Schema.optionalKey(Schema.String),
	title: Schema.String,
});
export type TaskRow = typeof TaskRow.Type;
const TaskQueue = Schema.Struct({ ready: Schema.Array(TaskRow), working: Schema.Array(TaskRow) });
export type TaskQueue = typeof TaskQueue.Type;

// Claude Code reads at most 4 MiB of a plugin's answer, so the overview leaves out the finished history that grows
// with the board: every item's record and Fleet's completed work.
const [ReadyFleet, UnavailableFleet] = FleetItemsProjection.members;
export const OverviewProjection = Schema.Struct({
	fleet: Schema.Union([ReadyFleet.mapFields(Struct.omit(["completed"])), UnavailableFleet]),
	goals: GoalsProjection.mapFields(Struct.omit(["items"])),
	tasks: TaskQueue,
});
