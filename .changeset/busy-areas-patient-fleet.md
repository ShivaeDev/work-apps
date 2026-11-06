---
"@shivaedev/work-board": minor
"@shivaedev/work-fleet": patch
---

### Changed

- `@shivaedev/work-fleet`: `daemon.fleetItems` lists only the areas that Fleet work holds, queues or reserves. It no longer lists every repository folder as an idle area.

### Fixed

- `@shivaedev/work-board`: Board waits up to 20 seconds for each Fleet read, up from 5, so a busy Fleet no longer shows as unavailable. Its Fleet view, items and brief checks together, stays within 25 seconds, inside the 30 seconds Claude Code waits for a plugin's request. A Fleet that has not answered by then is reported as not answering in time.

### Breaking

- `@shivaedev/work-board`: The `board` integration object no longer exports `areaFolders` or `repositoryRoot`. Fleet stopped using them. A consumer that needs area folders reads the repository directly.
