import { fence } from "@shivaedev/quality/imports/fence.ts";
import { anything, external, folders, modules } from "@shivaedev/quality/imports/fences/selectors.ts";

const boardCode = folders("packages/work-board/src").except(folders("packages/work-board/src/server"));
const markdownCode = folders("packages/work-board/src/client/document", "packages/work-board/src/render");
const markdownDependencies = modules(
	"react-markdown",
	"rehype-raw",
	"remark-directive",
	"remark-gfm",
	"unified",
	"unist-util-visit",
	"shiki",
	"mermaid",
	"hast",
	"mdast",
	"mdast-util-directive",
);

export default [
	fence("board-client-stays-browser-safe")
		.because("The browser modules ship to browsers: everything they reach stays browser-safe, never Node or other server code.")
		.from(folders("packages/work-board/src/client").except(markdownCode))
		.mayNotReach(
			anything.except(
				boardCode,
				markdownDependencies,
				modules("@shivaedev/changes", "@shivaedev/contract", "@shivaedev/errors", "@shivaedev/form", "@shivaedev/identity", "@shivaedev/react"),
				modules(
					"effect",
					"react",
					"react-dom",
					"@effect/atom-react",
					"@tanstack/react-router",
					"cn",
					"@base-ui/react",
					"class-variance-authority",
					"cmdk",
					"lucide-react",
					"@tanstack/react-table",
					"recharts",
				),
			),
		)
		.demonstratedBy({
			illegal: ["packages/work-board/src/client/formStatus.ts", external("node:fs")],
			legal: ["packages/work-board/src/client/formStatus.ts", external("@shivaedev/form/form.ts")],
		}),
	fence("document-rendering-stays-browser-safe")
		.because(
			"The React document view and its shared Markdown plugins reach only browser-safe Board data, Effect and the existing Markdown libraries.",
		)
		.from(markdownCode)
		.mayNotReach(
			anything.except(
				boardCode,
				markdownDependencies,
				modules("@shivaedev/changes", "@shivaedev/contract", "@shivaedev/errors", "@shivaedev/form"),
				modules("effect"),
				modules("react"),
			),
		)
		.demonstratedBy({
			illegal: ["packages/work-board/src/client/document/View.ts", external("node:fs")],
			legal: ["packages/work-board/src/client/document/View.ts", external("react-markdown")],
		}),
];
