---
"@shivaedev/work-board": minor
---

### Fixed

- `@shivaedev/work-board`: The Claude Code pane and its overview tool read the Board again on a board with much finished work. The overview answer had grown past the 4 MiB Claude Code reads of a plugin's answer, so the pane showed "The Work Board sent no answer to work-board.overview." It now carries only what the pane and the overview tools show, which keeps it small however much finished work the board keeps.

### Breaking

- `@shivaedev/work-board`: `work-board.overview` no longer returns `goals.items` or the ready Fleet's `completed` list. Read `work-board.goals` for the items and `work-board.fleetItems` for completed Fleet work.
