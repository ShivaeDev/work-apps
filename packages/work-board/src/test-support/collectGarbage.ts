import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { Effect } from "effect";

let gc: (() => void) | undefined;

export const collectGarbage = Effect.sync(() => {
	if (gc === undefined) {
		setFlagsFromString("--expose-gc");
		gc = runInNewContext("gc");
	}
	gc?.();
});
