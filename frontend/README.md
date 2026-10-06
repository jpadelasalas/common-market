# Frontend: Phase 1 federation spike

This is a shell plus three React/TypeScript remotes using Vite and Module Federation, as described in [architecture](../docs/architecture.md) and ADR-01/02. There is no backend yet. The session is always anonymous.

| App | Port | Mount |
| --- | --- | --- |
| shell | 5000 | owns header, top-level routes, manifest, recovery (UI-18) |
| storefront | 5001 | `/*` |
| seller | 5002 | `/seller/*` |
| admin | 5003 | `/admin/*` |

## Run

```sh
npm install -g pnpm   # corepack enable needs admin on this machine
pnpm install
pnpm build
pnpm preview        # all four apps; open http://localhost:5000 (one app exiting stops all; run `pnpm --filter <app> preview` separately for failure tests)
pnpm check          # safe-navigation path assertions
pnpm typecheck
```

Remotes run as production builds (`vite preview`). Cross-remote dev hot reload is not assumed (ADR-02).

## Spike checks (phase 1 exit evidence)

| Check | How |
| --- | --- |
| Deep link | Open `http://localhost:5000/seller/orders/42` directly |
| Failed remote recovery | Stop the seller preview, visit `/seller`: header stays, recovery shows. Restart it, press Try again |
| Contract mismatch | Set `contractMajor` to 2 for a remote in `apps/shell/dist/manifest.json`: recovery, console diagnostics |
| Independent release | `pnpm --filter @common-market/seller build`, then restart its preview; shell `dist` hash unchanged |
| Rollback | Serve an older seller build on another port and point its manifest `entry` at it; no shell rebuild |
| Singletons | `pnpm why @module-federation/runtime react react-router` shows one version each |

Runtime remote timeout defaults to 10 s; override at build time with `VITE_REMOTE_TIMEOUT_MS`.

## End-to-end tests

Playwright drives the installed Microsoft Edge (`channel: msedge`, no browser download) against the real stack. It resets the Laravel demo database first, then reuses running servers or starts them.

```sh
pnpm build
pnpm e2e            # 10 journeys; screenshots for design review land in test-results/screens
```
