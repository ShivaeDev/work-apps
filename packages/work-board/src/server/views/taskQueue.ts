import { isWork } from "#browser/views/now.ts";
import type { TaskQueue, TaskRow } from "#browser/views/OverviewProjection.ts";
import { inboxItems } from "#server/attention/inbox.ts";
import type { Snapshot } from "#server/search/snapshot.ts";
import { type Item, itemsOf } from "./items.ts";

const UNSTARTABLE: ReadonlySet<string | undefined> = new Set(["working", "done", "deferred", "dropped"]);

function idOf(reference: string): string {
	return reference.split("#")[0] ?? reference;
}

function rowOf({ document, id, title }: Item): TaskRow {
	const fields = document.parsed.fields;
	const goal = fields.relationships?.find((link) => link.kind === "implements")?.target;
	return {
		file: document.file,
		...(goal === undefined ? {} : { goal: idOf(goal) }),
		id,
		...(fields.owner === undefined ? {} : { owner: fields.owner }),
		title,
	};
}

export function taskQueue(snapshot: Snapshot): TaskQueue {
	const items = itemsOf(snapshot);
	const statuses = new Map(items.map((item) => [item.id, item.document.parsed.fields.status]));
	const waiting = new Set(inboxItems(snapshot).flatMap((ask) => ask.unblocks.map(idOf)));
	const tasks = items.filter((item) => isWork(item.document.parsed.fields)).sort((a, b) => a.id.localeCompare(b.id));
	function startable({ document, id }: Item): boolean {
		const fields = document.parsed.fields;
		return (
			fields.fleet === "approved"
			&& !UNSTARTABLE.has(fields.status)
			&& !waiting.has(id)
			&& (fields.relationships ?? []).every((link) => link.kind !== "depends_on" || statuses.get(idOf(link.target)) === "done")
		);
	}
	return {
		ready: tasks.filter(startable).map(rowOf),
		working: tasks.filter((item) => item.document.parsed.fields.status === "working").map(rowOf),
	};
}
