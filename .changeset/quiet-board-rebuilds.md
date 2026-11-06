---
"@shivaedev/work-board": patch
"@shivaedev/work-fleet": patch
---

### Fixed

- `@shivaedev/work-board`: The Board index keeps the decoded settled catalogue and archive state until those files change, so a reported edit reads only the edited file instead of reading the whole catalogue again on every rebuild.
- `@shivaedev/work-fleet`: A fresh read of a brief whose source did not change no longer invalidates the Board index, so reconciling done work no longer rebuilds the index for each record.
- `@shivaedev/work-fleet`: Fleet renders `fleet/status.md` and counts health only when its records change, and checks each Board snapshot's problems once instead of on every read pass.
