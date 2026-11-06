import { indexStory } from "./indexStory.ts";
import { SETTLED_CATALOGUE, settledLine } from "./settledCatalogue.ts";

export function indexedSettled(ids: readonly string[]) {
	return indexStory.trait("project", `the board keeps settled records for ${ids.join(", ")} and an archive state`, (engine) => {
		engine.notes.write(SETTLED_CATALOGUE, ids.map(settledLine).join(""));
		engine.notes.write(".board-archive.json", "[]");
	});
}
