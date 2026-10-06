# Architecture decision records

2026-10-05. Selected by the approved plan; implementation details remain proposed where indicated.

## ADR-01: Microfrontends serve the portfolio goal

Context: sole developer explicitly wants to showcase microfrontend engineering. A modular SPA would be simpler for commerce alone.

Decision: shell + storefront/seller/admin remotes, independently built and released. Business-area boundaries give concrete ownership and failure/deployment demonstrations.

Consequences: extra manifests, compatibility, routing, tests and deployment work. This is justified by BG-01, not a claim of multiple teams or high scale. Do not split individual components into remotes.

## ADR-02: Vite and Module Federation

Decision: React/TS + Vite, official Module Federation integration, runtime deployment manifest and versioned contracts. Alternatives: single-spa or one bundled SPA.

Reason: demonstrate runtime federation with the selected React stack. Integration spike must verify compatible singleton dependencies, nested routing, remote production loading and rollback before adding business features. No promise of unsupported development behavior.

## ADR-03: Laravel modular monolith

Decision: one Laravel deployment with domain modules in the backend monorepo; proposed PostgreSQL database. Alternatives: backend microservices or unstructured controllers.

Reason: stock allocation and multi-seller order creation benefit from one database transaction; service operations add no portfolio requirement here. Modules preserve clear boundaries without distributed transactions.

## ADR-04: Session authentication

Decision: Sanctum first-party SPA cookie sessions, CSRF protection and Laravel policies. Use one browser origin and API proxy. API tokens in browser storage are excluded.

Reason: all three remotes represent one first-party product. UI permissions do not authorize requests.

## ADR-05: Simulated payments

Decision: explicit demo result success/failure; no gateway/card entry; simulated refund bookkeeping on cancellation.

Reason: user excluded payment integration. Checkout retains meaningful error/idempotency behavior without moving money.

## ADR-06: Curated goods and restrained design

Decision: provisional Common Market identity, home/everyday catalog, light warm neutrals and deep green; shared typography and tokens across varied layouts.

Reason: product-led shopping and task-led operations support BG-03. Vercel is an inspiration for disciplined hierarchy, not a storefront template to copy. Dark mode, marketing analytics and decorative hero sections are deferred.

## ADR-07: Zero-cost portfolio operation

Decision: zero additional monetary spending is mandatory (CON-05). Retain independent frontend artifacts and the Laravel modular backend. Run the full stack on existing equipment; investigate non-trial free public hosting within quotas. Do not enable paid upgrades or rely on expiring credits.

Consequences: public backend availability/persistence are not guaranteed. Cloudflare Pages Free is a proposed static frontend host. A browser-only demo adapter is an optional proposal, not a replacement for Laravel or a claim of backend guarantees. See [zero-cost hosting](../hosting-zero-cost.md).
