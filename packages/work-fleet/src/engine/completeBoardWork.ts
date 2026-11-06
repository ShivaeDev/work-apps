import { Effect } from "effect";
import { responses } from "@shivaedev/work-board/server/integration/responses.ts";
import { briefChanged } from "#engine/boardBrief.ts";
import { refuseDeliveredId } from "#engine/deliveredId.ts";
import type { EngineState } from "#engine/makeState.ts";
import type { FleetRecord } from "#model.ts";
import type { Versioned } from "#storage/model.ts";

const { revisionOf } = responses;

export function boardCompletionAction(record: FleetRecord) {
	if (record.step === "done" && record.report !== undefined) {
		return "Done; report recorded.";
	}
	if (record.step === "done" && record.result?.kind === "no-change") {
		return "Done; no change needed.";
	}
	if (record.step !== "done" && !(record.step === "released" && /^PR #\d+ merged by a human /u.test(record.releaseReason ?? ""))) {
		return;
	}
	if (record.result?.kind !== "change") {
		return;
	}
	const number = record.result.prNumber ?? /\/(?<number>\d+)\/?$/u.exec(record.result.pr)?.groups?.number;
	return number === undefined ? undefined : `Done; PR #${number} merged.`;
}

export function completionSettlement(action: string, revision: string | undefined) {
	return revisionOf(JSON.stringify([action, revision ?? null]));
}

export function completeBoardWork(state: EngineState) {
	const reported = state.completionWarnings;
	return Effect.fn("Fleet.completeBoardWork")(function* (stored: Versioned<FleetRecord>) {
		const action = boardCompletionAction(stored.value);
		const complete = state.board.complete;
		const sourcePath = stored.value.boardSourcePath;
		const applicable =
			action !== undefined
			&& sourcePath !== undefined
			&& complete !== undefined
			&& stored.value.attempts.some((attempt) => attempt.role !== "reviewer" && attempt.receipt !== undefined);
		let failed = false;
		if (applicable) {
			let source = sourcePath;
			yield* state.board.get(stored.value.workId).pipe(
				Effect.flatMap((work) => {
					source = JSON.stringify([work.sourcePath, work.context]);
					return refuseDeliveredId(state, work).pipe(
						Effect.andThen(briefChanged(stored.value, work) ? Effect.void : complete(stored.value.workId, sourcePath, action)),
					);
				}),
				Effect.tap(() => Effect.sync(() => reported.delete(stored.value.workId))),
				Effect.catch((error) => {
					failed = true;
					const warning = JSON.stringify([source, error.message]);
					if (reported.get(stored.value.workId) === warning) {
						return Effect.void;
					}
					reported.set(stored.value.workId, warning);
					return Effect.logWarning(error.message);
				}),
			);
		}
		if (state.board.closeFinishedDecisions !== undefined) {
			yield* state.board.closeFinishedDecisions({ workId: stored.value.workId }).pipe(
				Effect.catchTag("BoardFailure", (error) => {
					failed = true;
					return Effect.logWarning(error.message);
				}),
			);
		}
		return applicable && !failed ? yield* settleCompletion(state, stored, action) : stored;
	});
}

// Marking the Board revision that completion and decision closure last saw lets the scheduler skip this record until that revision moves.
const settleCompletion = Effect.fn("Fleet.settleCompletion")(function* (state: EngineState, stored: Versioned<FleetRecord>, action: string) {
	if (state.board.workRevisions === undefined) {
		return stored;
	}
	const revision = yield* state.board.workRevisions().pipe(Effect.option);
	if (revision._tag === "None") {
		return stored;
	}
	const settled = completionSettlement(action, revision.value(stored.value.workId));
	if (stored.value.boardSettledRevision === settled) {
		return stored;
	}
	return yield* state
		.save(stored, { ...stored.value, boardSettledRevision: settled })
		.pipe(Effect.catchTag("StorageConflict", () => Effect.succeed(stored)));
});
