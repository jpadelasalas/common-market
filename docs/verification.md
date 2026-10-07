# Verification report

Date: 2026-10-05 (Asia/Manila).

## Deliverable status

| Deliverable | Status |
| --- | --- |
| Standalone project and documentation | Created at C:\toDelete\portfolio-marketplace |
| Brief, requirements, stories, state models and traceability | Created; specifications, not implemented app behavior |
| Architecture, ADRs, API/data outlines, permissions and roadmap | Created |
| Editable Pencil canvas | Delivered: 18 primary screens / 36 desktop-mobile frames |
| Foundations, reusable components and contextual states | Delivered, including 14 exceptional states |
| Screenshots and layout inspection | Performed through Pencil MCP; eight representative PNGs exported |
| Phase 1 federation spike (frontend/) | Built and smoke-tested 2026-10-05 (pnpm 12.9.1, Vite 7.3.6, @module-federation/vite 1.23.1, single runtime 2.9.2). Typecheck and safe-path check pass. Headless Edge rendered storefront, seller and admin remotes, search query and deep link /seller/orders/42 through the shell. Seller remote stopped and admin contract mismatch both showed UI-18 recovery with intact header. Not yet checked: Try again after restart, independent release hash, manifest rollback, CI pipelines |
| Phase 2 backend foundation (backend/) | Laravel 13.34 + Sanctum on local SQLite (PostgreSQL deferred). Modules Identity/Sellers/Catalog, ULID ids, demo fixtures, request IDs, JSON error contract. php artisan test: 15 passed / 72 assertions (session, logout, CSRF 419, login throttle 429, no account enumeration, guest 401, cross-role 403, pending seller 403, cross-seller direct ID 404, draft hidden, request_id). Manual check through shell proxy :5000 to :8100 confirmed CSRF + cookie session. Deferred: order/checkout tables (Phase 3), audit events (first audited action, Phase 4/5), DB CHECK constraints (PostgreSQL) |
| Phase 3 vertical slice | Catalog filters/sort/detail, buyer cart (API-02), idempotent demo checkout (API-03), purchases (API-04); shell session + CSRF client + UI-17 sign-in; storefront UI-01..UI-07 against live API. php artisan test: 28 passed / 208 assertions (canonical CM-1001 totals PHP 2,170.00, success = one purchase + one order per seller + stock decrement, same-key replay, changed-payload 409, demo failure creates nothing, stale cart 409, price change blocks until accepted, last-item race sequential, snapshots survive catalog edits, buyer scoping). Headless Edge E2E through shell: sign-in → discovery → filters → 3 product pages → cart totals → validation → demo failure → success → CM-1001 confirmation → empty cart → order list. Storefront-only rebuild left shell artifact hash unchanged (independent release). Not yet: true concurrent allocation test (needs PostgreSQL), keyboard/screen-reader audit |
| Phase 4 operations | Seller orders (queue, detail, central row-locked versioned transitions, safe replay), buyer/seller cancellation before shipment with stock restored once + demo refund + payment summary, seller products (draft create, versioned edit, stock, publish/unpublish, moderation hold), audit events, shared packages/ui, seller workspace UI-09..UI-12, buyer tracking UI-07/UI-08. php artisan test: 42 passed / 325 assertions. Playwright (installed Edge, real stack): 10 passed covering sign-in return path, role/pending-seller gating, cross-shop direct URL 404, full buyer purchase + single-shop cancellation, seeded CM-1001 timelines, seller fulfilment to delivered, draft→publish→storefront, two-tab stale stock edit. Desktop 1440 and mobile 390 captures compared with Pencil UI-07..UI-12. Playwright found and fixed: duplicate dialog title ids (wrong accessible name). Not yet: concurrent cancel/ship race on PostgreSQL, screen-reader audit |
| PostgreSQL (Neon, free plan, Singapore) | App runs on Neon dev branch (PostgreSQL 18.6). PostgreSQL-only migration adds 9 CHECK constraints and a table-owned purchase number sequence. tests/Postgres runs real two-process races against an isolated neondb_test database (guarded: refuses any database not named *_test): last-item race, same key twice, cancel vs fulfilment, partial refund, CHECK violations; 5/5 passed on three consecutive runs. Neon exposed two defects SQLite hid: purchase sequence survived migrate:fresh (numbers continued at CM-1004) and demo_payments.status varchar(16) rejected partially_refunded; both fixed with regression coverage. Feature suite stays on in-memory SQLite, now forced in phpunit.xml and guarded in TestCase. Local latency: ~120 ms per query, ~1 s per page; OPcache enabled to offset antivirus file scanning |
| Phase 5 administration | Seller application review (APP numbers, contact, category, about, sample photo), approve/reject with mandatory rejection reason, decisions final, versioned, audited with actor; listing moderation (published → moderated with reason → cleared to draft → seller republishes), moderation hold blocks seller publish; read-only purchase oversight with payment and per-shop fulfilment separate. Admin remote UI-13..UI-16. php artisan test: 48 Feature / 380 assertions; Playwright on Neon: 14/14 (admin approves → shop gains workspace, reasoned rejection, moderation hides listing while CM-1002 snapshot remains and seller republishes after clearance, oversight shows separate statuses). Captures compared with Pencil exports UI-14/UI-15; fixed mobile moderation panel scrolling out of view (now scrolls and receives focus) |
| Phase 6 hardening | Accessibility: axe WCAG 2.1 A/AA scans on 16 screens (buyer, seller, admin) report zero violations; keyboard test of the cancel dialog (focus in, Escape closes, focus returns) and the new mobile main menu (aria-expanded, Escape returns focus, closes on navigation). Not done: manual screen-reader review. Federation: remotes build immutable versioned artifacts (dist/<version>/); manifest-only release to seller 0.2.0 and rollback to 0.1.0 verified; remote outage shows recovery and Try again recovers (fixed: browsers cache failed module imports per URL, retry now uses a per-attempt URL); contract major mismatch blocked. Security: API sends nosniff, DENY framing, default-src none CSP, HSTS over HTTPS; shell sends CSP allowing scripts only from itself and the remote origins (no inline scripts). Performance (this PC, Neon Singapore, median of 3 loads to main heading): 1.6 s discovery, 1.6 s results, 1.6 s product, 2.1 s buyer orders, 2.1 s seller orders, 1.6 s admin orders. CI workflow (backend tests, type-checks, independent build per app) passed on its first GitHub run, 2026-10-06: all six jobs green. One-command start (scripts/start.mjs) and runbook added. Playwright: 23/23 |
| Public deployment (2026-10-07) | Live at https://cm-shell.pages.dev on free tiers: Cloudflare Pages (cm-shell, cm-storefront, cm-seller, cm-admin), Render free web service (FrankenPHP container, Singapore), Neon production branch (migrated and seeded on first boot). Fixed on first deploy: Render refuses binaries with file capabilities, so the container drops frankenphp cap_net_bind_service. Verified from outside: shell, deep links, manifest pointing at the three live remotes, remote CORS limited to the shell, shell CSP with real origins, API security headers including HSTS (HTTPS detected behind proxies), /api proxy (0.3 s warm), CSRF cookie, login, session, buyer cart and purchases through the proxy. Read-only Playwright smoke (pnpm e2e:live): three roles, three remotes, no console or CSP errors. Free-tier caveat: the API sleeps after 15 idle minutes |
| Application runtime security/accessibility tests | Automated only (see Phase 6); manual screen-reader review and public deployment pending |

Pencil document: [common-market.pen](../common-market.pen).
Existing user frame bi8Au (800 × 600 at 0,0) is preserved. New design roots occupy separate canvas space. The document is modified only through MCP.

## Documentation checks

- DOC-01: relative Markdown links checked after design documentation updates.
- DOC-02: token JSON parses; nine specified color contrast pairs previously calculated with sRGB relative luminance.
- DOC-03: canonical fixture = PHP 2,170.00: Kubo Living PHP 1,300.00 + Daily Objects PHP 870.00. Items PHP 2,010.00 + delivery PHP 160.00.
- DOC-04: 12 requirements, 25 acceptance criteria and 18 primary screens have stable IDs and traceability.
- DOC-05: generated documentation checked for trailing whitespace; no existing application files were edited.

| Pair | Ratio | Minimum | Result |
| --- | --- | --- | --- |
| Primary text on background | 14.26:1 | 4.5:1 | Pass |
| Secondary text on background | 5.92:1 | 4.5:1 | Pass |
| White on primary action | 8.63:1 | 4.5:1 | Pass |
| White on primary hover | 11.44:1 | 4.5:1 | Pass |
| Error on error surface | 6.45:1 | 4.5:1 | Pass |
| Warning on warning surface | 6.11:1 | 4.5:1 | Pass |
| Information on information surface | 7.48:1 | 4.5:1 | Pass |
| Control border on white | 4.16:1 | 3:1 | Pass |
| Focus ring on background | 8.05:1 | 3:1 | Pass |

## Design checks

- DES-01: all UI-01–UI-18 exist as named desktop 1440px and mobile 390px frames. Frame context includes story/criteria IDs, next actions and intermediate responsive behavior. See [inventory](design/canvas-inventory.json).
- DES-02: settled canvas geometry checked for clipping and root overlap; corrections included a seller sidebar sizing warning. Existing user content preserved.
- DES-03: screenshots inspected across buyer, seller, administrator, shared and exception workflows. Product image slots render; unsuitable initial basket imagery replaced.
- DES-04: cart, checkout, confirmation, tracking, seller detail and oversight use the same multi-seller fixture. Confirmation shows both orders Placed; subsequent views show Kubo Processing and Daily Objects Placed. Payment stays separate.
- DES-05: seller queue counts match displayed rows. Mobile operations use labeled rows; product browsing uses a two-column grid.
- DES-06: component states include focus, hover, disabled/busy actions, validation, draft editing, filters and cancellation. EX-01–EX-14 cover loading, empty, field error, stock conflict, demo failure, session expiry, forbidden access, stale stock, remote failure, moderation reason error, missing imagery, failed search and unknown checkout outcome.
- DES-07: remote recovery keeps shell navigation and offers retry/safe navigation. Unknown checkout reconciliation refers to the existing attempt, not a fresh submission.
- DES-08: eight [PNG previews](../exports/README.md) exported after typography corrections. Six stock-photo sources/authors recorded in inventory.

Screens are editable static designs with annotated transitions. They do not prove interactive keyboard behavior, ARIA announcements, focus trapping or screen-reader compliance. Fonts are specified as Geist / Geist Mono and visually reviewed; implementation must verify loading and tabular numerals.

## Runtime checks deferred

Seller isolation, concurrent stock allocation, duplicate checkout, payment failure, cancellation/stock restoration, independent remote deployment, session/cookie deployment, performance and accessibility remain planned implementation checks. No test results are claimed for them.

Usability testing with people and exact commercial product photography remain open. Remote stock-photo URLs are illustrative and not packaged for guaranteed offline use.

## Repository status

Local Git repository initialized on main. No remote, initial commit, application implementation, migrations or deployment changes. Marketplace artifacts are isolated from the original storage repository.

## Budget update

CON-05 added: zero additional monetary spending. Brief, requirements, ADR-07, architecture and roadmap now carry this restriction; [hosting options](hosting-zero-cost.md) distinguish confirmed budget from proposed providers/demo mode. Provider documentation reviewed; no account, deployment or billing configuration created. TC-14 remains a future release check.
