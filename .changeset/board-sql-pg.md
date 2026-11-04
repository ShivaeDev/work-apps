---
"@shivaedev/work-board": patch
---

### Fixed

- Installing Board from npm also installs `@effect/sql-pg`, which the `@shivaedev/server` host loads when Board starts, so `work-board` and `@shivaedev/work-board/server/*` modules no longer fail with `ERR_MODULE_NOT_FOUND`.
