# Project brief

## Purpose and success

Common Market is a provisional name for an online marketplace of physical home and everyday goods. A sole developer builds it to demonstrate microfrontend engineering, using a coherent buyer/seller/admin experience.

| Goal | Success evidence | Status |
| --- | --- | --- |
| BG-01 | Independently build, release and roll back a remote without rebuilding the shell; demonstrate a failed remote without losing shell navigation | Confirmed goal; proposed evidence |
| BG-02 | Complete one two-seller purchase, then process and track both seller orders | Confirmed portfolio context; proposed scenario |
| BG-03 | Distinct workflows with coherent visual language, legible information, responsive layouts and meaningful recovery | Confirmed design goal; proposed evaluation |

This is a portfolio, not an operational launch. No market demand or production capacity has been validated. Do not invent revenue, conversion, availability or adoption claims.

## People and operating model

- Buyer: wants to find useful goods, understand total cost and track each delivery.
- Seller: owns their shop, listings, inventory and fulfillment.
- Administrator: approves sellers, moderates listings and oversees orders.
- Developer/decision-maker: one person; microfrontend experience is the central demonstration goal.

Seller-managed marketplace and buyer/seller/admin coverage were explicitly selected. No independent engineering teams exist; independent deployment is an intentional architecture exercise.

## Confirmed constraints

React + TypeScript; Vite + Module Federation; Laravel modular backend in a monorepo; shell plus storefront, seller and admin remotes. No payment gateway. Zero additional monetary spending is a confirmed restriction (CON-05). Documentation and Pencil design are the current deliverable, with application implementation later.

Checkout groups by seller; one purchase links seller-specific orders. Demo payment outcomes, transactional inventory, idempotency, manual delivery updates, pre-shipment cancellation and moderation are in the approved planning scope.

## Proposed defaults

| Item | Default | Reason / validation |
| --- | --- | --- |
| Identity | Common Market | Neutral working name, can be renamed without changing workflows |
| Catalog | Home, kitchen, everyday accessories | Enables informative photography and simple shipping examples |
| Locale | English; PHP currency; Asia/Manila display timezone | Fictional Philippine demo; owner may change |
| Data | Fictional addresses and accounts | No real transactions or personal-data collection needed |
| Database | PostgreSQL | Relational constraints and transactional writes; still proposed |
| Design | Light theme, Geist Sans, warm neutrals, deep green | Distinct storefront with shared operational components |
| Account model | Buyer, seller and administrator are separate seeded accounts | Simple role isolation for v1 |
| Hosting | One browser origin with reverse-proxied Laravel API; remotes served as static assets | Simplifies session and deep-link behavior |

## Scope and exclusions

Must have: catalog/filtering, product details, seller-grouped cart, checkout, demo result, buyer orders/tracking, seller product editor/inventory/fulfillment, seller approval and listing moderation, shared sign-in and remote failure recovery.

Deferred: real payments/payouts, shipping carrier APIs, chat, recommendation engine, reviews, coupons, multi-currency, production returns/refunds, public registration/recovery, complex seller verification, variants, tax automation and business analytics.

Proposed performance targets: browser Core Web Vitals LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1; API p95 ≤ 500ms for catalog reads on a documented demo dataset. These are targets, not measured results. Budget is confirmed zero. Expected users, timeline and hosting provider remain unknown; they do not block these design deliverables.

## Risk register

| Risk | Priority / effort | Response |
| --- | --- | --- |
| Microfrontend overhead for one developer | High / M | Few domain boundaries, shared contracts, remote-specific CI and compatibility demo |
| Hidden multi-seller shipping complexity | High / M | Explicit per-seller costs and deliveries throughout cart and orders |
| Concurrent stock or duplicate submissions | High / M | Atomic checkout and idempotency acceptance criteria |
| Attractive mockup hides incomplete journeys | High / M | Story-to-screen coverage and exception-state boards |
| Pencil disconnected | High / S | Confirm file through MCP before editing; report blocked states honestly |
