import { expect } from "@effect/vitest";
import { approvedWork } from "#test/hostStory.ts";
import { idleHost } from "#test/idleScheduler.ts";
import { pendingNoChangeReview } from "#test/noChangeCompletion.ts";

const SUMMARY = "next_action: Done; no change needed.";

idleHost.it(
	"launching other work does not wake a done record whose completion is settled",
	[approvedWork(["one"]), pendingNoChangeReview],
	function* (daemon) {
		yield* daemon.finishWithoutChange("one");
		const scheduler = yield* daemon.startIdleScheduler();
		const started = scheduler.reconciledWork().length;

		yield* daemon.dispatchOther("two");

		expect(scheduler.reconciledWork().slice(started)).not.toContain("one");
	},
);

idleHost.it(
	"an edit to a done brief wakes its record once, and Fleet applies completion again for the new revision",
	[approvedWork(["one"]), pendingNoChangeReview],
	function* (daemon) {
		yield* daemon.finishWithoutChange("one");
		const scheduler = yield* daemon.startIdleScheduler();
		const started = scheduler.reconciledWork().length;
		const done = daemon.readBoard("one.md");
		daemon.writeBoard("one.md", done.replace(SUMMARY, "next_action: Check the follow-up"));

		yield* daemon.waitForBoard("one.md", (source) => source.includes(SUMMARY));
		yield* daemon.dispatchOther("two");

		expect(
			scheduler
				.reconciledWork()
				.slice(started)
				.filter((workId) => workId === "one"),
		).toEqual(["one"]);
	},
);

idleHost.it(
	"a done brief reopened outside Fleet is marked done again after one reconcile",
	[approvedWork(["one"]), pendingNoChangeReview],
	function* (daemon) {
		yield* daemon.finishWithoutChange("one");
		const scheduler = yield* daemon.startIdleScheduler();
		const started = scheduler.reconciledWork().length;
		daemon.writeBoard("one.md", daemon.readBoard("one.md").replace(`${SUMMARY}\n`, "").replace("status: done", "status: ready"));

		yield* daemon.waitForBoard("one.md", (source) => source.includes("status: done"));
		yield* daemon.dispatchOther("two");

		expect(
			scheduler
				.reconciledWork()
				.slice(started)
				.filter((workId) => workId === "one"),
		).toEqual(["one"]);
	},
);
