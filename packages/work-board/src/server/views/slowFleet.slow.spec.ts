import { Clock } from "effect";
import { expect, vi } from "vitest";
import { boardStory, projectFiles } from "#test/boardStory.ts";
import { slowFleetDaemon } from "#test/workspaceBoardTraits.ts";

vi.setConfig({ testTimeout: 60_000 });

const project = projectFiles({ "one.md": "---\nid: one\nkind: task\nstatus: draft\n---\n# First task" });
const reported = { completed: [], items: [{ stage: "queued" as const, stageEnteredAt: 100, updatedAt: 200, workId: "one" }] };

boardStory.it("a busy Fleet that answers after 8 seconds still shows its work", [project, slowFleetDaemon(reported, 8)], function* ({ fleetWork }) {
	expect(yield* fleetWork()).toMatchObject({ items: [expect.objectContaining({ workId: "one" })], state: "ready" });
});

boardStory.it(
	"a Fleet that has not answered after 20 seconds is reported as not answering in time",
	[project, slowFleetDaemon(reported, 25)],
	function* ({ fleetWork }) {
		expect(yield* fleetWork()).toMatchObject({
			reason: expect.stringMatching(/^Fleet on port \d+ didn't answer within 20 seconds, so agent work and its health are unknown\.$/u),
			state: "unavailable",
		});
	},
);

boardStory.it(
	"the Board answers within 25 seconds when Fleet's items and brief checks are both slow",
	[project, slowFleetDaemon(reported, 15, 15)],
	function* ({ fleetWork }) {
		const started = yield* Clock.currentTimeMillis;
		const fleet = yield* fleetWork();
		expect({ fleet, inTime: (yield* Clock.currentTimeMillis) - started < 26_000 }).toMatchObject({
			fleet: { reason: "Fleet brief validation is unavailable; these briefs have not been checked.", state: "unavailable" },
			inTime: true,
		});
	},
);
