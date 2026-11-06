import { Order } from "effect";
import type { Snapshot } from "#server/search/snapshot.ts";

// Maps and Sets compare by content and missing fields equal undefined ones, as a reader of the index sees them.
export function comparable(value: unknown): unknown {
	if (value instanceof Map) {
		return [...value].map(comparable);
	}
	if (value instanceof Set) {
		return [...value].map(comparable);
	}
	if (Array.isArray(value)) {
		return value.map(comparable);
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, field]) => field !== undefined)
				.map(([key, field]) => [key, comparable(field)]),
		);
	}
	return value;
}

export function kept(before: Snapshot, after: Snapshot) {
	return after.documents
		.filter((document) => {
			const previous = before.documents.find((candidate) => candidate.file === document.file);
			function entries(snapshot: Snapshot) {
				return snapshot.entries.filter((entry) => entry.file === document.file);
			}
			return previous === document && entries(before).every((entry, index) => entries(after)[index] === entry);
		})
		.map((document) => document.file)
		.sort(Order.String);
}
