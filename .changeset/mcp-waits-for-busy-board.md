---
"@shivaedev/work-board": patch
---

### Fixed

- `work-board mcp` waits 30 seconds for a busy board instead of 10, so a Fleet view that takes most of its 25-second budget no longer reads as a stopped board. A board that does not answer in time is reported as busy, and an unreachable board as not reachable with the command that starts it.
