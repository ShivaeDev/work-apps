import { describe, expect, it } from "vitest";
import { unansweredLine } from "#lines.ts";

describe("a Board request that got no answer", () => {
	it("calls a Board busy when the host gave up waiting for its answer", () => {
		const cause = new Error(
			"workboard: $.http.fetch(http://localhost/_board/rpc) over /work/.work/board.sock aborted: no complete answer within 30000ms",
		);
		expect(unansweredLine("/work", cause)).toBe(
			"The Work Board for /work is busy: it took longer than 30 seconds to answer. The pane asks again on its next refresh.",
		);
	});

	it("calls a Board not running when nothing answered on its socket", () => {
		const cause = new Error(
			"workboard: $.http.fetch(http://localhost/_board/rpc) over /work/.work/board.sock failed: ECONNREFUSED: connect ECONNREFUSED",
		);
		expect(unansweredLine("/work", cause)).toBe("The Work Board for /work isn't running. Start it there: npx @shivaedev/work-board .work");
	});
});
