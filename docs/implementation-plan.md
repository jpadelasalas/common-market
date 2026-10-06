# Implementation plan

This document separates the current documentation/design delivery from future app development. Solo developer, microfrontend skill demonstration, no production payments.

## Current deliverable

1. Capture brief, confirmed scope, assumptions and open questions.
2. Specify stories, transitions, ownership, contracts and example totals.
3. Define user flows, design tokens, components and desktop/mobile inventory.
4. Inspect existing Pencil document and preserve user content.
5. Build foundations/components, then buyer journey, seller journey and administration, then exceptional states.
6. Inspect screenshots and correct layout; check links, traceability and token contrast.
7. Record actual verification, unresolved issues and Pencil artifact location.

Pencil MCP access was restored and all planned primary frames were designed. See verification for actual design checks. Access the encrypted document through MCP; no filesystem replacement is permitted.

## Future implementation phases

| Phase | Work | Exit evidence |
| --- | --- | --- |
| 1: Federation spike (built; recovery verified, rollback pending) | Shell + three empty React/TS remotes; runtime manifest; nested routing; compatible singletons; independent pipelines | Release/rollback one remote without shell rebuild; failed remote recovery and deep link |
| 2: Backend foundation (built; see backend/README.md) | Laravel modular app, proposed PostgreSQL, migrations, fixtures, Sanctum, policies, validation/audit/request IDs | Session/CSRF and cross-role/ownership tests |
| 3: First vertical slice (built; concurrency test pending PostgreSQL) | Catalog → cart → atomic two-seller demo checkout → confirmation | Canonical totals, stock conflict, demo failure and idempotency tests |
| 4: Operations (built; Playwright + API tests) | Seller products/inventory/fulfillment; buyer tracking/cancellation | Valid transitions, stock restoration and seller isolation |
| 5: Administration (built; API, Postgres and Playwright tests) | Seeded application review, moderation and order inspection | Admin-only decisions, reasons/audit and preserved history |
| 6: Hardening/demo (built locally; public hosting pending decision) | Accessibility, responsiveness, performance measurement, remote compatibility and deployment documentation | Tested walkthrough, evidence captures, rollback/reset runbook |

No timeline estimate is confirmed. Finish each slice before expanding scope. Generate OpenAPI and executable schemas in phase 2/3 rather than describing outlines as implementation-complete contracts.

## Planned runtime tests

| Test | Scenario / expected evidence |
| --- | --- |
| TC-01 | Search/filter/back navigation, no results, unpublished product hidden; AC-01–AC-03 |
| TC-02 | Canonical two-seller cart totals, quantity limits, changed price, shipping before checkout; AC-04/AC-05 |
| TC-03 | Checkout success/failure, same-key replay, concurrent duplicate, changed payload conflict, unknown result reconciliation; AC-06–AC-08 |
| TC-04 | Two buyers compete for last item; exactly one allocation wins, no partial purchase; AC-09 |
| TC-05 | Independent seller timelines, cancel before shipment once, cancellation/shipping race, partial/full demo adjustment; AC-10/AC-11 |
| TC-06 | Draft/publish validation, negative stock and stale inventory edit preserve input; AC-13/AC-15 |
| TC-07 | Direct-ID and nested-resource cross-buyer/seller denial, response excludes unrelated addresses; AC-12/AC-14/AC-16 |
| TC-08 | Allowed fulfillment transitions, rejected reverse/duplicate transitions, timestamped events; AC-16/AC-17 |
| TC-09 | Admin approval/moderation only, reason required, stale decision, historic order snapshots preserved; AC-18–AC-20 |
| TC-10 | Remote independent deploy/rollback, unavailable/mismatched remote, deep link, shell remains usable; AC-21/AC-22 |
| TC-11 | Shared session/logout/expiry across remotes, CSRF denial, safe return paths; AC-23 |
| TC-12 | Listing content safely rendered, DTO/log privacy and invalid input; security matrix |
| TC-13 | 1440/390 and intermediate layouts, keyboard/dialog/screen-reader checks, contrast, reduced motion; AC-24/AC-25 |

Use Vitest/React Testing Library for frontend behavior, Playwright for critical journeys, and Laravel PHPUnit integration tests against a disposable PostgreSQL database for locking/constraints. These are future tooling selections, not installed dependencies.

## Portfolio evidence and release readiness

Record remote version change with unchanged shell artifact hash, manifest rollback, failed remote recovery, and refused cross-seller request. Explain why microfrontends were selected and their solo-developer cost.

Before publishing: CI checks, migration strategy, fictitious fixtures, origin/session/security configuration, asset provenance, backups/reset and rollback procedure. Hosting provider is unresolved; publishing is not authorized by this documentation/design request.

## Confirmed zero-cost restriction

CON-05 applies to every implementation phase. Add an initial hosting feasibility check before choosing public infrastructure; use the local full-stack environment on existing equipment regardless of provider availability. No paid plans, domains, APIs, trial-credit dependency or automatic paid overage. Public browser-only demo mode is optional and not yet approved as the hosted product.

TC-14: verify dependency/service costs and deployment settings against the zero-cost constraint before release. Hosting remains unconfigured; no billing checks are claimed as passed. See [zero-cost hosting options and acceptance gate](hosting-zero-cost.md).
