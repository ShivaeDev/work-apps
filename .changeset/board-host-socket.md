---
"@shivaedev/work-board": minor
---

### Changed

- Serve `board.sock` through the application host, sharing its routes, request limits and live-query transport. Existing Board plugin and MCP clients keep using the same socket path.

### Breaking

- Remove `server/boardSocket.ts`. Direct callers should configure `appHost` from `@shivaedev/server/appHost.ts` with `config.socketPath`, their RPC group and handlers. `serveBoard` continues to publish `board.sock` for Board plugin and MCP clients.
