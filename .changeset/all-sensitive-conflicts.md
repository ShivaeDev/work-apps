---
"@shivaedev/work-board": minor
---

### Breaking

- `boardLayer` startup failures carry every conflicting field in `SensitiveFieldConflict.conflicts`. Iterate over these entries instead of reading the top-level `field`, `publicSchema` and `sensitiveSchema`; the message lists all entries.
