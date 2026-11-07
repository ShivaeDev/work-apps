import { Schema, Struct } from "effect";
import { FleetItemsProjection } from "./FleetItemsProjection.ts";
import { GoalsProjection } from "./GoalsProjection.ts";

// Claude Code reads at most 4 MiB of a plugin's answer, so the overview leaves out the finished history that grows
// with the board: every item's record and Fleet's completed work.
const [ReadyFleet, UnavailableFleet] = FleetItemsProjection.members;
export const OverviewProjection = Schema.Struct({
	fleet: Schema.Union([ReadyFleet.mapFields(Struct.omit(["completed"])), UnavailableFleet]),
	goals: GoalsProjection.mapFields(Struct.omit(["items"])),
});
