---
"@shivaedev/work-board": minor
---

### Added

- Accept `working` as an authored status for a task an agent is working on. Goal progress counts it as running, Now shows it under Working, and the file fallback for In progress lists it beside ready tasks.
- `client.api.overview.query()` and the `board_overview` MCP tool return `tasks`: `ready` lists the tasks ready to start now (approved, not working, done, deferred or dropped, no open ask blocking them, every `depends_on` target done) and `working` lists the tasks with status `working`.
