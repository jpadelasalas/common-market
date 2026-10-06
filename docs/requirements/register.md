# Requirement register

Source baseline: user conversation and approved plan, 2026-10-05. Confirmed scope below does not make every implementation detail a business fact.

| ID | Item | Goal | Status / source |
| --- | --- | --- | --- |
| REQ-01 | Demonstrate independently deployable React/TS microfrontends | BG-01 | Confirmed user goal |
| REQ-02 | Maintain a Laravel backend monorepo with modular business boundaries | BG-01 | Confirmed plan |
| REQ-03 | Browse/search/filter published physical goods and inspect product details | BG-02 | Confirmed plan |
| REQ-04 | Cart and checkout group items and shipping by seller | BG-02 | Confirmed plan |
| REQ-05 | Demo payments only, with success/failure and no card fields | BG-02 | Confirmed plan |
| REQ-06 | Buyer purchase history and separate seller fulfillment tracking | BG-02 | Confirmed plan |
| REQ-07 | Seller owns product/inventory maintenance and fulfillment | BG-02 | Confirmed model |
| REQ-08 | Admin approves sellers, moderates listings and oversees orders | BG-02 | Confirmed coverage |
| REQ-09 | Role/object authorization enforced by Laravel | BG-01, BG-02 | Confirmed plan |
| REQ-10 | Shared design tokens, responsive connected flows and relevant exceptional states | BG-03 | Confirmed plan |
| REQ-11 | Stock safety, duplicate checkout protection and pre-shipment cancellation | BG-02 | Confirmed plan |
| REQ-12 | Traceable documentation plus editable desktop/mobile Pencil screens | BG-03 | Confirmed deliverable |

## Business rules (specification proposals)

| ID | Rule | Enforcement |
| --- | --- | --- |
| BR-01 | Only approved sellers may publish; only published listings appear publicly | Catalog query, publishing policy, UI disabled explanation |
| BR-02 | Server derives item prices and shipping; client totals never authorize a charge/order | Checkout, price snapshots, cart summary |
| BR-03 | Checkout allocates stock and creates purchase/seller orders atomically after demo success | Transaction, stock locks, constraints |
| BR-04 | Demo payment failure creates no purchase and changes no stock; cart/address remain | Checkout failure path and retry screen |
| BR-05 | Same user + idempotency key + same payload returns the same result; changed payload conflicts | Checkout uniqueness and request hash |
| BR-06 | Seller reads/writes only their own records; buyer only their own purchases | Policies and scoped queries |
| BR-07 | Cancel only a placed/processing seller order; restore stock once and mark demo refund | Order transition transaction |
| BR-08 | Order item titles, prices, seller and delivery-address snapshots do not change with later catalog edits | Snapshot records, API read contracts |
| BR-09 | Stock cannot fall below zero; updates use concurrency protection | DB constraint, versioned update and locks |
| BR-10 | One shipping fee per seller order: PHP 80.00 in this fictional demo | Checkout calculation; proposed fixture policy |
| BR-11 | Admin moderation requires a reason and audit entry; historic orders remain visible | Admin API, audit, listing history |
| BR-12 | Remotes cannot bypass shell session integration or backend checks | Shared contract and Laravel authorization |

## Constraints, exclusions and dependencies

- CON-01: sole developer; no team-scaling justification is claimed.
- CON-02: microfrontends are required to showcase engineering skill.
- CON-03: React/TypeScript and Laravel are selected.
- CON-04: this delivery is documents/design only; no app scaffolding.
- CON-05: zero additional monetary spending. No paid services, purchased domain, trial-credit dependency or automatic paid overage; use existing equipment and non-trial free options.
- DEP-01: Pencil MCP must access the user-opened document to edit the canvas.
- DEP-02: product photography requires suitable assets and recorded provenance.
- OOS-01: real payments, payouts and bank/card information.
- OOS-02: real courier integrations, production returns, chat and recommendations.
- FUT-01: real commerce integrations only if a later project requires them.

## Assumptions and questions

| ID | Item | Impact if wrong | Owner / what is blocked |
| --- | --- | --- | --- |
| ASM-01 | English/PHP/fictional PH addresses | Copy, formats and fixtures change | Project owner; no current blocker |
| ASM-02 | PostgreSQL | Future schema/locking implementation changes | Developer; confirm before scaffolding |
| ASM-03 | Separate seeded roles; approved sellers seeded | Sign-in and account features change | Owner; public account workflows deferred |
| ASM-04 | Simple SKUs, no variants, flat demo delivery fee | Editor and totals change | Owner; v1 design baseline |
| ASM-05 | Light theme only for v1 | Additional theme work | Owner; no current blocker |
| OQ-01 | Actual Pencil file path/access | Resolved: common-market.pen accessible via MCP | C:\toDelete\portfolio-marketplace; design delivered |
| OQ-02 | Hosting provider; budget confirmed zero | Persistent public backend and session topology need verification | Developer; no paid deployment permitted; see zero-cost hosting plan |
| OQ-03 | Timeline and expected demo dataset/load | Performance schedule and load tests provisional | Owner; no document blocker |
| OQ-04 | Product photo sources available to Pencil | Resolved for design: six Unsplash photos placed | Sources recorded in design/canvas-inventory.json; exact commercial product imagery deferred |

Confirm assumptions by recording the decision/date and promoting the relevant item without renumbering existing IDs.
