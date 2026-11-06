import type { MetadataDocument as BoardDocument } from "@shivaedev/work-board/integration/metadata.ts";
import { responses } from "@shivaedev/work-board/server/integration/responses.ts";
import { documentSource } from "@shivaedev/work-board/server/metadata/model.ts";
import type { Snapshot as BoardSnapshot } from "@shivaedev/work-board/server/search/snapshot.ts";
import { publishedDecision } from "#board/closePublishedDecision.ts";
import { snapshotProblems } from "#board/workPolicy.ts";
import type { BoardFailure } from "#policy.ts";

const { revisionOf } = responses;

export interface PublishedDecisionDocument {
	readonly decision: NonNullable<ReturnType<typeof publishedDecision>>;
	readonly document: BoardDocument;
}

export interface WorkIndex {
	readonly decisions: (workId: string) => readonly PublishedDecisionDocument[];
	readonly problems: ReadonlyMap<string, BoardFailure>;
	readonly revision: (workId: string) => string | undefined;
}

// Snapshots never change, and the scheduler and decision closure consult them per record, so each snapshot is indexed once.
const indexes = new WeakMap<BoardSnapshot, WorkIndex>();

export function workIndex(snapshot: BoardSnapshot): WorkIndex {
	const known = indexes.get(snapshot);
	if (known !== undefined) {
		return known;
	}
	const decisions = new Map<string, PublishedDecisionDocument[]>();
	for (const document of snapshot.documents) {
		const decision = publishedDecision(document);
		if (decision !== undefined) {
			decisions.set(decision.workId, [...(decisions.get(decision.workId) ?? []), { decision, document }]);
		}
	}
	const revisions = new Map<string, string | undefined>();
	const index: WorkIndex = {
		decisions: (workId) => decisions.get(workId) ?? [],
		problems: snapshotProblems(snapshot),
		revision: (workId) => {
			if (!revisions.has(workId)) {
				revisions.set(workId, workRevision(snapshot, workId, decisions.get(workId) ?? []));
			}
			return revisions.get(workId);
		},
	};
	indexes.set(snapshot, index);
	return index;
}

function workRevision(snapshot: BoardSnapshot, workId: string, decisions: readonly PublishedDecisionDocument[]) {
	const matches = snapshot.model.ids.get(workId);
	const brief = matches?.length === 1 ? matches[0] : undefined;
	if (brief === undefined && decisions.length === 0) {
		return;
	}
	return revisionOf(
		JSON.stringify([
			brief === undefined ? null : [brief.file, documentSource(brief)],
			...decisions
				.map(({ document }) => [document.file, documentSource(document)])
				.sort(([left], [right]) => String(left).localeCompare(String(right))),
		]),
	);
}
