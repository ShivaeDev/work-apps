---
"@shivaedev/work-fleet": patch
---

### Fixed

- `@shivaedev/work-fleet`: Done and released records whose Board completion is already applied no longer wake on every scheduling write. Fleet stores the Board revision its completion last saw (migration `38_board_settled_revision`) and reconciles such a record again only when its brief or one of its published decisions changes.
- `@shivaedev/work-fleet`: Closing finished decisions for one work item reads only that item's published decisions instead of scanning every Board document.
