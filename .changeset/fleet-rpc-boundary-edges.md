---
"@shivaedev/work-fleet": minor
---

### Added

- Export `fleetFailure` from `operations.ts` for handler registrations' shared error mapping and redacted fallback.

### Breaking

- `exposeFailure` maps typed errors and preserves defects. Import `fleetFailure` from `operations.ts` for the previous handler-edge behavior, or apply `rpcBoundary(FleetError, options)` after `exposeFailure` in the handler module. Fleet and daemon handler registrations retain their existing fallback behavior.
- `daemonHandlers` reads UUIDs through Effect's `Crypto` service. Provide `NodeCrypto.layer` or an application `Crypto` implementation when constructing it; the Fleet runtime already supplies this service.
