import { fileURLToPath } from "node:url";

export const sourceNode = ["--conditions=source", "--import", fileURLToPath(import.meta.resolve("../../../../script/adapters/publishedPackages.ts"))];
