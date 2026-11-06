import { Effect } from "effect";
import type { FleetHealth } from "@shivaedev/work-board/server/integration/diagnostics.ts";
import { views } from "#engine/views.ts";
import { executing, type FleetRecord } from "#model.ts";

type RecordCounts = Pick<FleetHealth, "queued" | "running" | "waiting">;

// The store hands back the same record object until its row changes, so equal identities mean the published views still hold.
function sameRecords(previous: readonly FleetRecord[] | undefined, next: readonly FleetRecord[]) {
	return previous !== undefined && previous.length === next.length && previous.every((record, index) => record === next[index]);
}

export function publishedRecords() {
	let published: readonly FleetRecord[] | undefined;
	return {
		changed: (records: readonly FleetRecord[]) => !sameRecords(published, records),
		published: (records: readonly FleetRecord[]) =>
			Effect.sync(() => {
				published = records;
			}),
	};
}

export function recordCounter() {
	let counted: { readonly counts: RecordCounts; readonly records: readonly FleetRecord[] } | undefined;
	return (records: readonly FleetRecord[]) => {
		if (counted === undefined || !sameRecords(counted.records, records)) {
			counted = { counts: recordCounts(records), records };
		}
		return counted.counts;
	};
}

function recordCounts(records: readonly FleetRecord[]): RecordCounts {
	const { waiting } = views(records);
	return {
		queued: records.filter((record) => record.step === "queued").length,
		running: records.filter(executing).length,
		waiting: { automation: waiting.automation.length, maintainer: waiting.maintainer.length, orchestrator: waiting.orchestrator.length },
	};
}
