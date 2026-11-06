---
"@shivaedev/work-board": patch
"@shivaedev/work-fleet": patch
---

### Fixed

- `@shivaedev/work-board`: Free each Board index read once a rebuild replaces it. Every rebuilt index kept the read before it alive, so a long-running Board server on a frequently changing board grew its heap until Node ran out of memory.
- `@shivaedev/work-fleet`: The Fleet daemon no longer runs out of memory on a frequently changing board, because the Board index it reads no longer keeps every earlier read alive.
