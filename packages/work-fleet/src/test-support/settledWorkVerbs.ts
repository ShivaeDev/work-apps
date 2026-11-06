import { Effect, Schedule } from "effect";
import { withLive } from "@shivaedev/test/withLive.ts";
import { task } from "#test/fleetHost.ts";
import { NO_CHANGE } from "#test/githubResult.ts";
import type { HostStoryEngine } from "#test/HostStoryEngine.ts";
import { hostBoardVerbs } from "#test/hostBoardVerbs.ts";
import { hostVerbs } from "#test/hostVerbs.ts";

export function settledWorkVerbs(engine: HostStoryEngine, tell: (line: string) => void) {
	const host = hostVerbs(engine, () => undefined);
	const board = hostBoardVerbs(engine, () => undefined);
	return {
		dispatchOther: (workId: string) =>
			Effect.gen(function* () {
				tell(`approve ${workId} on the Board and wait until Fleet launches it`);
				const source = task(workId, "approved");
				board.writeBoard(`${workId}.md`, source);
				yield* board.awaitIndexedSource(`${workId}.md`, source);
				return yield* host.waitForRecord(workId, (record) => record.attempts[0]?.receipt !== undefined);
			}),
		finishWithoutChange: (workId: string) =>
			Effect.gen(function* () {
				tell(`${workId} is reviewed as needing no change and its brief is marked done`);
				const launched = yield* host.approve(workId);
				host.finishTurn(launched.value, NO_CHANGE);
				host.finishTurn(yield* host.reconcile(workId));
				return yield* host.reconcile(workId);
			}),
		waitForBoard: (file: string, ready: (source: string) => boolean) => {
			tell(`wait until ${file} on the Board is ready`);
			return withLive(
				Effect.sync(() => board.readBoard(file)).pipe(
					Effect.repeat({ schedule: Schedule.spaced("10 millis"), until: ready }),
					Effect.timeout("10 seconds"),
				),
			);
		},
	};
}
