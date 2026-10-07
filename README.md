# Common Market

**Live demo: https://cm-shell.pages.dev** (free hosting: the first visit after a quiet period can take up to a minute while the API wakes up).

A portfolio marketplace where independent shops sell to buyers, built to demonstrate React/TypeScript microfrontends backed by a Laravel modular monolith on PostgreSQL. All people, shops and payments are fictional; no money moves.

## What is in the repository

| Part | Contents |
| --- | --- |
| [frontend](frontend/README.md) | Shell plus storefront, seller and admin remotes (Vite + Module Federation), shared `packages/ui`, Playwright tests |
| [backend](backend/README.md) | Laravel 13 API with Identity, Sellers, Catalog, Checkout, Orders and Administration modules; Sanctum cookie sessions |
| [docs](docs/README.md) | Brief, requirements, architecture and ADRs, API/data outlines, security matrix, design system, [runbook](docs/runbook.md), [verification](docs/verification.md) |
| [common-market.pen](common-market.pen) | Editable Pencil design (desktop and mobile frames); open through Pencil MCP |
| `.github/workflows/ci.yml` | Free CI: backend tests, type-checks, independent build per app |

## Run it locally

```sh
pnpm --dir frontend build
node scripts/start.mjs        # API on :8100, shell on :5000, remotes on :5001-5003
```

Open http://localhost:5000 and pick a demo account on the sign-in page. Setup, data reset, release/rollback and the reviewer walkthrough are in the [runbook](docs/runbook.md); public hosting steps are in [deployment](docs/deployment.md).

## Highlights

- Independent remote releases and manifest-only rollback; the shell survives a failed or incompatible remote and recovers with **Try again**.
- Server-authoritative multi-shop checkout: idempotent, atomic stock allocation, proven with real two-process races on PostgreSQL.
- Per-shop fulfilment and cancellation with stock restored once, demo refunds and an audit trail.
- Role and ownership enforcement on every API route; another shop's or buyer's record is simply not found.
- Automated WCAG 2.1 A/AA scans with zero violations on all main screens; keyboard-tested dialogs and menu.

Status: v1 features complete and publicly hosted on free tiers: Cloudflare Pages (shell and three remotes), Render (Laravel API), Neon (PostgreSQL). See [deployment](docs/deployment.md).

## How it was built

Directed by John Patrick (project owner). Planning documents and the UI/UX design (Pencil file, design system, flows) were produced with **OpenAI Codex**; the code (frontend, backend, tests, CI and scripts) was written with **Anthropic Claude (Claude Code)**, implementing that plan and design. Details: [authorship](docs/README.md#authorship).
