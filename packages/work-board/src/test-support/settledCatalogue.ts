export const SETTLED_CATALOGUE = ".board-settled/catalogue.jsonl";

export function settledLine(id: string) {
	return `${JSON.stringify({ file: `questions/${id}.md`, id, item: id, modified: 0, revision: "settled", targets: [] })}\n`;
}
