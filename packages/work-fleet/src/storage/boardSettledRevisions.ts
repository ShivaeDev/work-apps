import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { childTable } from "#storage/recordChildren.ts";

export const boardSettledRevisions = Effect.fn("FleetStore.boardSettledRevisions")(function* (namespace: string) {
	const sql = yield* SqlClient.SqlClient;
	for (const table of [`${namespace}_records`, childTable(namespace, ["history"])]) {
		yield* sql`alter table ${sql(table)} add column "boardSettledRevision" text`;
	}
});
