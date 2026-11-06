---
"@shivaedev/work-board": patch
"@shivaedev/work-fleet": patch
---

### Fixed

- Free each Board index read once a rebuild replaces it. Every rebuilt index kept the read before it alive, so a long-running Board or Fleet daemon on a frequently changing board grew its heap until Node ran out of memory.
