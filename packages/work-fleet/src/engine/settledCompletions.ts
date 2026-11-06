import { Effect } from "effect";
import { inBoardReadPass } from "#board/readPass.ts";
import { boardCompletionAction, completionSettlement } from "#engine/completeBoardWork.ts";
import type { FleetRecord } from "#model.ts";
import { BoardGateway } from "#policy.ts";
import type { Versioned } from "#storage/model.ts";

export const settledCompletions = Effect.fn("Fleet.settledCompletions")(function* (records: readonly Versioned<FleetRecord>[]) {
	const revisions = (yield* BoardGateway).workRevisions;
	const settled = new Set<string>();
	if (revisions === undefined) {
		return settled;
	}
	const revision = yield* inBoardReadPass(revisions()).pipe(Effect.orElseSucceed(() => undefined));
	if (revision === undefined) {
		return settled;
	}
	for (const { value } of records) {
		const action = boardCompletionAction(value);
		if (action !== undefined && value.boardSettledRevision === completionSettlement(action, revision(value.workId))) {
			settled.add(value.workId);
		}
	}
	return settled;
});
