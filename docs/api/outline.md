# API outline

Proposed implementation contracts; no running endpoints or OpenAPI compliance claim. Prefix business endpoints with /api/v1. Use Sanctum cookie sessions and CSRF setup for writes.

## Common contract

- IDs are opaque strings; money uses integer centavos plus currency PHP, never floating-point totals.
- Responses use `data`; lists also contain `meta.page`, `meta.per_page`, `meta.total`.
- Proposed page size 24, maximum 100; allowlist filters/sort keys.
- Errors contain stable `code`, human `message`, optional field errors and `request_id`.
- 401 sign-in required; 403 forbidden capability; 404 unavailable/non-owned resource; 409 stock/version/state/key conflict; 422 validation; 429 throttle with Retry-After.
- IDs alone never grant ownership. Do not expose internal fields, private seller details or other buyers' addresses.
- Protect write inputs against mass assignment; authoritative prices and seller IDs come from records, not client claims.

## Capabilities

| ID | Methods and paths | Input/output boundary | Role |
| --- | --- | --- | --- |
| API-01 | GET /products; GET /products/{slug} | q/category/seller/min_price/max_price/in_stock/sort/page → published product cards/details | Public |
| API-02 | GET /cart; PUT /cart/items/{productId}; DELETE /cart/items/{productId} | Quantity → recalculated seller groups, stock warnings and totals | Buyer |
| API-03 | POST /checkout-attempts; GET /checkout-attempts/{key} | Idempotency-Key, cart version, address, demo_outcome → purchase reference or failure | Buyer owner |
| API-04 | GET /purchases; GET /purchases/{id} | Buyer-scoped history/details including seller orders | Buyer owner |
| API-05 | POST /seller-orders/{id}/cancel | Expected version, reason → current order and demo adjustment | Buyer owner / owning seller |
| API-06 | GET/POST /seller/products; PATCH /seller/products/{id} | Fields: title, category, description, dimensions/materials, image refs, price_centavos → own product | Approved seller |
| API-07 | PATCH /seller/products/{id}/inventory; POST /seller/products/{id}/publish; POST /seller/products/{id}/unpublish | Expected version, nonnegative stock or visibility action → current record | Owning approved seller |
| API-08 | GET /seller/orders; GET /seller/orders/{id}; POST /seller/orders/{id}/transitions | target state, expected version, optional dispatch reference → own order/event | Owning seller |
| API-09 | GET /admin/seller-applications; GET /admin/seller-applications/{id}; POST /admin/seller-applications/{id}/decision | decision, reason when rejecting, expected version → application | Admin |
| API-10 | GET /admin/products; POST /admin/products/{id}/moderation; GET /admin/purchases; GET /admin/purchases/{id} | moderation action/reason/version or oversight filters → scoped admin data | Admin |
| API-11 | GET /auth/session; POST /auth/login; POST /auth/logout; GET /sanctum/csrf-cookie | Credentials/session roles, no password in response | Shell session |

Login/logout and CSRF paths are Laravel web routes outside the versioned business prefix, under /auth so the shell proxy never collides with SPA routes. Public account registration/recovery is not part of the seeded demo.

## Checkout transaction

Create/read buyer-scoped attempt under a uniqueness constraint; request fingerprint covers cart version, normalized address and demo outcome. Serialize same-key processing. Replay persisted success/failure for identical payload; return 409 for changed payload.

Validate approved seller/published product, recalculate prices and fixed demo shipping fees, and lock inventory rows in deterministic ID order. On success, decrement stock and create purchase, seller orders, immutable lines and initial events in one transaction. Record attempt result in that transaction. On failure, persist a failure result separately without an order or stock delta.

If server totals changed since review, respond 409 cart_changed with authoritative cart; require explicit review and a fresh key. The frontend must not automatically submit a more expensive order. An unknown network outcome reconciles GET attempt before another submit.

## Authentication and integration contract

Session: user ID/display name, role, optional seller ID and approved status. Shell integrates session state; Laravel remains authority. Host/remote metadata and route contracts are specified in [architecture](../architecture.md).

Detailed request length limits, image upload transport and generated OpenAPI belong to the future contract implementation phase. Current UI uses seeded image references.
