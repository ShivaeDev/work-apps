import { expect } from "vitest";
import { boardStory, projectFiles } from "#test/boardStory.ts";

const NOTE = "n".repeat(512 * 1024);
const FINISHED = Array.from({ length: 9 }, (_, index) => index);

boardStory.it(
	"the plugin reads goal progress from a board whose finished tasks hold more than Claude Code reads of one answer",
	[
		projectFiles({
			"goal.md": "---\nid: goal.ship\nkind: goal\nstatus: ready\n---\n# Ship the Board",
			...Object.fromEntries(
				FINISHED.map((index) => [
					`done/${index}.md`,
					`---\nid: task.done-${index}\nkind: task\nstatus: done\nnext_action: ${NOTE}\nrelationships:\n - kind: implements\n   target: goal.ship\n---\n# Finished ${index}\n`,
				]),
			),
		}),
	],
	function* ({ openPlugin, pluginProgress }) {
		yield* openPlugin();

		expect(yield* pluginProgress()).toBe("9 of 9 done");
	},
);

const CRITERION = "c".repeat(1536 * 1024);

boardStory.it(
	"the plugin says the Board's answer broke off at Claude Code's read limit instead of saying it sent none",
	[
		projectFiles(
			Object.fromEntries(
				[1, 2, 3].map((index) => [
					`goal-${index}.md`,
					`---\nid: goal.wide-${index}\nkind: goal\nstatus: ready\ncriteria:\n - id: wide\n   text: ${CRITERION}\n---\n# Wide goal ${index}\n`,
				]),
			),
		),
	],
	function* ({ openPlugin, pluginProblem }) {
		yield* openPlugin();

		expect(yield* pluginProblem()).toBe(
			"The Work Board's answer to work-board.overview breaks off mid-message after 4194304 characters. Claude Code reads at most 4 MiB of an answer.",
		);
	},
);
