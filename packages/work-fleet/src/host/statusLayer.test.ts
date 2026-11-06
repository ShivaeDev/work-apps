import { expect } from "@effect/vitest";
import { humanMergeRequired } from "#test/engineTraits.ts";
import { publicationStory, publishedBoard, suspendedValidation } from "#test/publicationStory.ts";

for (const denyDelivery of [false, true]) {
	publicationStory.it(
		`scheduler publication follows ${denyDelivery ? "human intervention" : "completion"} and leaves authored status untouched`,
		[publishedBoard, humanMergeRequired(denyDelivery)],
		function* (fleet) {
			yield* fleet.prepareWork("one");
			yield* fleet.schedule();
			expect(fleet.publications.status()).toContain("Stage: working");
			const board = yield* fleet.publications.boardPage();
			const initial = yield* fleet.publications.readPage(board);
			expect(initial.document.reading?.board).toBe(true);
			expect(initial.counts).toEqual(expect.arrayContaining([expect.objectContaining({ count: 1, title: "Active" })]));
			expect(initial.document.source).toContain("/_board/item/one");
			fleet.finishWorkers();
			yield* fleet.schedule();
			const step = denyDelivery ? "waiting" : "done";
			expect((yield* fleet.get("one")).value.step).toBe(step);
			expect(fleet.publications.status()).toContain(`Stage: ${step}`);
			expect(fleet.publications.status()).toContain("[PR](<https://example.invalid/pr/one>)");
			const refreshed = yield* fleet.publications.awaitPage(board, step);
			expect(refreshed.document.source).toContain(`Stage: ${step}`);
			expect(fleet.publications.task()).toBe(fleet.publications.source());
		},
	);
}
publicationStory.it(
	"run publishes a suspended validation step without waiting for reconciliation to finish",
	[publishedBoard, suspendedValidation],
	function* (fleet) {
		yield* fleet.prepareWork("one");
		yield* fleet.schedule();
		fleet.finishWorkers();
		expect(yield* fleet.publications.runUntilValidationPublished()).toContain("Stage: reviewing");
	},
);
publicationStory.it("a failed publication keeps execution usable and the next scheduler cycle repairs the view", [publishedBoard], function* (fleet) {
	yield* fleet.publications.blockStatus();
	yield* fleet.prepareWork("one");
	yield* fleet.schedule();
	expect((yield* fleet.get("one")).value.step).toBe("working");
	fleet.publications.restoreStatus();
	fleet.finishWorkers();
	yield* fleet.schedule();
	expect(fleet.publications.status()).toContain("Stage: done");
	expect(fleet.publications.task()).toBe(fleet.publications.source());
});
publicationStory.it("idle passes over unchanged work leave the status unrendered until the work changes", [publishedBoard], function* (fleet) {
	yield* fleet.publications.observeWrites();
	yield* fleet.publications.idlePass();
	yield* fleet.publications.idlePass();
	expect(fleet.publications.publishedWorkIds()).toEqual([]);
	yield* fleet.prepareWork("one");
	expect(fleet.publications.publishedWorkIds()).toEqual([["one"]]);
});
publicationStory.it("an idle pass repairs a status write that failed while the work stayed unchanged", [publishedBoard], function* (fleet) {
	yield* fleet.publications.blockStatus();
	yield* fleet.prepareWork("one");
	fleet.publications.restoreStatus();
	yield* fleet.publications.idlePass();
	expect(fleet.publications.status()).toContain("/_board/item/one");
});
