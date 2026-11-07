import { expect, vi } from "vitest";
import { boardStory, projectFiles } from "#test/boardStory.ts";
import { slowFleetDaemon } from "#test/workspaceBoardTraits.ts";

vi.setConfig({ testTimeout: 60_000 });

const project = projectFiles({ "one.md": "---\nid: one\nkind: task\nstatus: draft\n---\n# First task" });
const reported = { completed: [], items: [{ stage: "queued" as const, stageEnteredAt: 100, updatedAt: 200, workId: "one" }] };

boardStory.it(
	"an agent's board_overview waits for a busy Fleet that answers after 15 seconds",
	[project, slowFleetDaemon(reported, 15)],
	function* ({ agentReads }) {
		expect(yield* agentReads("board_overview")).toMatchObject({
			fleet: { items: [expect.objectContaining({ stage: "queued", workId: "one" })], state: "ready" },
		});
	},
);
