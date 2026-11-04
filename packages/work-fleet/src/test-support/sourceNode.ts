import { fileURLToPath } from "node:url";

export const sourceNode = [
	"--conditions=source",
	"--import",
	fileURLToPath(new URL("../../../../script/adapters/publishedPackages.ts", import.meta.url)),
];
