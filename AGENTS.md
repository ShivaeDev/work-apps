# ShivaeDev Work Apps

You are working in Work Apps, the repository of Work Board (`@shivaedev/work-board`), Work Fleet (`@shivaedev/work-fleet`) and the private Work Board plugin for Claude Code. They are applications built on the ShivaeDev Platform framework, which they consume from npm like any other application, so a gap you find in a framework package is fixed in [ShivaeDev/platform](https://github.com/ShivaeDev/platform) and reaches this repository through a pin update, never through a local copy or patch. Think of yourself as a senior Effect engineer who owns every line they touch and leaves every file in better shape than they found it.

## How we work

Everything here is written in Effect and follows the framework's design: non-Effect code lives only in `adapters/` folders and `src/test-support` kits, failures stay typed, and each job has one path through the framework package that owns it. Each package's own `AGENTS.md` holds its direction and contracts. Specs are stories that drive the real engine through the package's story kit in `src/test-support`; a pure function gets a plain `.unit` test. Test PostgreSQL behavior against real PostgreSQL; those specs skip without their database URL, and a skipped test proves nothing.

Framework packages are pinned to exact published versions in the `catalog` of `pnpm-workspace.yaml`, and every manifest takes them through `catalog:`. The apps run their own TypeScript sources under the `source` condition. Published framework packages expose their sources under the same condition, and Node refuses to strip types inside `node_modules`, so every Node process that runs app sources also loads `script/adapters/publishedPackages.ts` with `--import`, which sends installed packages to their builds; spawn helpers in `src/test-support` take their arguments from `sourceNode.ts`.

Follow this guidance over a bad pattern in the surrounding code, and fix the debt you touch in the same change. The quality baseline in each `quality-baseline.jsonl` shard only goes down: when a check fails, fix the code, and the finding tells you how. Docs state the current truth; history lives in git.

## Daily commands

Run `./script/update` once per checkout; it installs dependencies, builds the plugin client, installs the pre-commit hook that runs `pnpm lint` and `pnpm typecheck`, and prepares the local test databases. Never skip the hook. While you work, run `pnpm lint`, apply fixes and formatting with `pnpm format`, and run focused tests with `pnpm --filter @shivaedev/<package> test <paths>`, with `PLATFORM_SQL_TEST_DATABASE_URL` set for PostgreSQL specs. `pnpm ready` is the fast static gate; CI runs the full suite against PostgreSQL. Run one heavy process (tests, typecheck, builds) at a time; the scripts take a machine-wide lock for that reason.

Make each change on its own branch in `.worktrees/<name>`, created with `git worktree add`. Every `CLAUDE.md` is a symlink to the `AGENTS.md` beside it; edit the `AGENTS.md`. Do not edit versions or `CHANGELOG.md` outside a release.

## When you need more

- For the framework design and its boundaries, read [the framework guide](https://github.com/ShivaeDev/platform/blob/main/docs/framework/README.md).
- For the quality rules and how the baseline moves, read the README of `@shivaedev/quality` in `node_modules`.
- Before you write or review a story or its kit, read [the story-testing skill](https://github.com/ShivaeDev/platform/blob/main/packages/skills/skills/story-testing/SKILL.md).
