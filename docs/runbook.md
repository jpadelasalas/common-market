# Runbook: run, reset, release, roll back, demo

Local, zero-cost (CON-05). Windows commands shown; paths are relative to the repository root.

## Prerequisites (once)

- PHP 8.3 with `pdo_pgsql`, `pdo_sqlite` and OPcache enabled (`C:/php/php.ini`), Composer, Node 22, pnpm 12, Microsoft Edge (for Playwright).
- `backend/apps/api/.env` from `.env.example`, filled with the Neon `dev` branch values and `DB_TEST_URL` pointing at a database whose name ends in `_test`. Never paste these values into chats, tickets or logs.
- `composer install` in `backend/apps/api`; `pnpm install` in `frontend`.

## Run the demo

```sh
pnpm --dir frontend build          # versioned remote artifacts: apps/<remote>/dist/<version>/
node scripts/start.mjs             # Laravel :8100 + shell :5000 + remotes :5001-5003; Ctrl+C stops all
```

Open http://localhost:5000 and use the demo buttons on the sign-in page (password `demo-password` for all fictional accounts). The first request after a while can take a few seconds while Neon resumes.

## Reset demo data

```sh
cd backend/apps/api
php artisan migrate:fresh --seed   # catalog, CM-1001..CM-1003, two pending applications (~2 min over the network)
```

## Release one remote, then roll back (AC-21)

The shell is never rebuilt. Each remote build is an immutable folder; the shell reads `apps/shell/dist/manifest.json` at runtime.

1. Build the new release beside the old one:
   `RELEASE_VERSION=0.2.0 pnpm --dir frontend --filter @common-market/seller build` → `apps/seller/dist/0.2.0/`
2. Release: in `frontend/apps/shell/dist/manifest.json`, set the seller `entry` to `http://localhost:5002/0.2.0/remoteEntry.js` and `version` to `0.2.0`. Reload `/seller`: the sidebar shows `Portfolio demo · v0.2.0`.
3. Roll back: set the entry back to `/0.1.0/remoteEntry.js`. Reload: `v0.1.0`. Old folders are kept, so rollback is instant.

Bumping a remote's `contractMajor` in the manifest makes the shell refuse it and show recovery instead of mounting an incompatible remote.

## Show failure recovery (AC-22)

`scripts/start.mjs` stops everything when one part exits, so start the parts separately for this demo, in three terminals:

```sh
php backend/apps/api/artisan serve --port=8100
pnpm --dir frontend --filter @common-market/shell preview
pnpm --dir frontend --filter @common-market/storefront preview
```

Sign in as the seller and open `/seller`: the seller remote is not running, so the shell keeps its header and shows the recovery screen. Start it in a fourth terminal (`pnpm --dir frontend --filter @common-market/seller preview`) and press **Try again**: the workspace loads without a page reload.

## Tests

| Command | What it proves | Runtime |
| --- | --- | --- |
| `php artisan test` (in `backend/apps/api`) | API rules, ownership, checkout, fulfilment, admin (in-memory SQLite, forced and guarded) | ~10 s–2 min |
| `php artisan test --testsuite=Postgres` | Real two-process races and CHECK constraints on `DB_TEST_URL` (refuses non-`*_test` databases) | ~1 min |
| `pnpm --dir frontend e2e` | Playwright journeys, WCAG A/AA scans, federation release/rollback/recovery, mobile menu, timings (resets the dev database first) | ~5 min |
| CI (`.github/workflows/ci.yml`) | Backend tests, type-checks, safe-path check, independent build per app | on push |

## Walkthrough for reviewers (about 10 minutes)

1. Buyer (**Use buyer**): filter Home goods, add the mug ×2, towel and tray, see two shop groups and PHP 2,170.00; place a demo order with **Failure** (nothing created), then **Success**; cancel one shop's order on the tracking page.
2. Seller (**Use seller**): open KL-1001, mark it shipped and delivered; edit stock; add a draft product and publish it.
3. Administrator (**Use administrator**): approve Sari Studio, reject Habi Home with a reason, unpublish a listing with a reason, inspect CM-1001 (payment and each shop's status shown separately).
4. Microfrontends: release seller 0.2.0 and roll back via the manifest; show recovery with a stopped remote.

## Troubleshooting

- Pages take 2–3 s or tests time out: check OPcache is enabled (`php -v` shows Zend OPcache); antivirus scanning slows cold file reads.
- `php artisan serve` stops responding: restart it; SQLite runs use WAL mode, Neon runs are unaffected.
- Port 8000 is taken on this machine (Apache), so the API uses 8100.
EOF
