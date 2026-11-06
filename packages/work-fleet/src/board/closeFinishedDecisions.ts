import { Effect } from "effect";
import type { MetadataDocument as BoardDocument } from "@shivaedev/work-board/integration/metadata.ts";
import { managedRequestReceipt } from "@shivaedev/work-board/server/attention/managedRequestReceipt.ts";
import type { Snapshot as BoardSnapshot } from "@shivaedev/work-board/server/search/snapshot.ts";
import { closePublishedDecision, publishedDecision } from "#board/closePublishedDecision.ts";
import type { ClosedDecision } from "#board/schema.ts";
import { type PublishedDecisionDocument, type WorkIndex, workIndex } from "#board/workIndex.ts";
import type { BoardFailure } from "#policy.ts";

// Each closure syncs its file and directory, so a sweep in sequence waits on every sync in turn.
const WRITE_CONCURRENCY = 16;

export interface CloseFinishedOptions {
	readonly dryRun?: boolean;
	readonly finishedWork?: ReadonlyMap<string, string>;
	readonly workId?: string;
}

export function closeFinishedDecisions(realRoot: string, snapshot: Effect.Effect<BoardSnapshot, BoardFailure>) {
	return Effect.fn("FleetBoard.closeFinishedDecisions")(function* (options: CloseFinishedOptions = {}) {
		const current = yield* snapshot;
		const index = workIndex(current);
		const published =
			options.workId === undefined
				? current.documents.flatMap((document) => {
						const decision = publishedDecision(document);
						return decision === undefined ? [] : [{ decision, document }];
					})
				: index.decisions(options.workId);
		const answered = options.workId === undefined ? answeredQuestions(current) : new Set<string | undefined>();
		const candidates = published.flatMap(({ decision, document }) => {
			const candidate = finishedDecision(current, index, decision, document, options, answered);
			return candidate === undefined ? [] : [{ decision: { ...candidate, sourcePath: document.file } satisfies ClosedDecision, document }];
		});
		if (options.dryRun) {
			return candidates.map(({ decision }) => decision);
		}
		const closed = yield* Effect.forEach(
			candidates,
			({ decision, document }) =>
				closePublishedDecision(realRoot, document, decision.reason).pipe(Effect.map((updated) => (updated === undefined ? [] : [decision]))),
			{ concurrency: WRITE_CONCURRENCY },
		);
		return closed.flat();
	});
}

function answeredQuestions(snapshot: BoardSnapshot) {
	const questions = new Map(
		snapshot.documents.flatMap(({ parsed }) =>
			parsed.fields.question && parsed.fields.id ? [[parsed.fields.id, parsed.fields.question.source] as const] : [],
		),
	);
	return new Set(
		snapshot.documents.flatMap(({ parsed }) => (parsed.fields.response?.type === "answer" ? [questions.get(parsed.fields.response.question)] : [])),
	);
}

function finishedDecision(
	snapshot: BoardSnapshot,
	index: WorkIndex,
	decision: PublishedDecisionDocument["decision"],
	document: BoardDocument,
	options: CloseFinishedOptions,
	answered: ReadonlySet<string | undefined>,
) {
	if (decision.request.state !== "open" || index.problems.has(document.file)) {
		return;
	}
	const receipt = managedRequestReceipt(document, decision.request, snapshot.model);
	if (receipt?.disposition === "applied") {
		return { reason: "Closed because Fleet applied the answer to this decision.", workId: decision.workId };
	}
	const reason = options.finishedWork?.get(decision.workId);
	if (reason !== undefined) {
		return { reason, workId: decision.workId };
	}
	if (options.workId === undefined && answered.has(document.file)) {
		return;
	}
	const matches = snapshot.model.ids.get(decision.workId);
	const work = matches?.length === 1 ? matches[0] : undefined;
	const status = work?.parsed.fields.status;
	if (work === undefined || index.problems.has(work.file) || !["done", "deferred", "dropped"].includes(status ?? "")) {
		return;
	}
	return { reason: `Closed because Board work ${decision.workId} is ${status}.`, workId: decision.workId };
}
