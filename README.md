# ShivaeDev Work Apps

The applications ShivaeDev runs its own work with, built on the [ShivaeDev Platform](https://github.com/ShivaeDev/platform) framework:

- [Work Board](packages/work-board/README.md) (`@shivaedev/work-board`) serves a folder of Markdown plans as a live local page where a person reads their agents' work, answers their questions and gives direction in context.
- [Work Fleet](packages/work-fleet/README.md) (`@shivaedev/work-fleet`) carries approved Board tasks through coding agents, independent review and required checks, then queues their green pull requests.
- [The Work Board plugin](packages/work-board-plugin/README.md) shows what needs you, what Fleet has in flight and how your goals are doing inside Claude Code.

The apps depend on the framework's published npm packages at exact versions, so this repository installs, builds and tests without a Platform checkout.

## Development

Requirements:
- Node.js at the version in `.node-version`
- pnpm through Corepack, at the version in `package.json`'s `packageManager`
- Docker, or PostgreSQL client tools (`psql`) when reusing a native local service

```sh
corepack enable
./script/update
pnpm ready
```

`./script/update` calls `pnpm run setup`, which installs frozen dependencies, builds the plugin client, installs the pre-commit hook that runs the checks of `pnpm lint` and `pnpm typecheck`, and prepares the test databases. `pnpm ready` is the fast static gate. `pnpm test` runs every package's tests, `pnpm build` builds the packages, and CI runs the full suite against PostgreSQL across shards.

Setup starts or reuses one PostgreSQL service on `127.0.0.1:55432` through `@shivaedev/local-postgres` and never stops or removes an existing service or volume. `TEST_DATABASE_URL` supplies the connection settings for tests, with a base name of `work_apps_test`; `PLATFORM_SQL_TEST_DATABASE_URL` defaults to the `work_apps_test_sql` database beside it. `pnpm test` sets both; for a focused PostgreSQL run, pass the variable yourself:

```sh
PLATFORM_SQL_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/work_apps_test_sql \
  pnpm --filter @shivaedev/work-fleet test src/host/answerHints.spec.ts
```

`pnpm board` and `pnpm fleet` run the Board and Fleet command lines from this checkout's sources.
