# Backend: Laravel modular monolith (Phase 2 foundation)

`apps/api` is one Laravel 13 deployment (ADR-03) with business code under `app/Modules/{Identity,Sellers,Catalog,Checkout,Orders,Administration}`.

## Database: Neon PostgreSQL (free plan, Singapore)

| Neon branch | Used by | `.env` key |
| --- | --- | --- |
| `production` | future public hosting; untouched | — |
| `dev` | local app (`php artisan serve`) | `DB_HOST`, `DB_PASSWORD`, … (direct host, not `-pooler`) |
| `test` | `tests/Postgres` concurrency suite; wiped every run | `DB_TEST_URL` |

PostgreSQL-only integrity lives in `2026_10_06_100000_add_postgres_integrity`: CHECK constraints (no negative stock/prices, consistent totals) and the purchase number sequence. Sessions and cache stay on local files because the database is remote. The fast Feature suite always runs on in-memory SQLite (`phpunit.xml`), so it never touches Neon.

Local PHP needs `pdo_pgsql` (enabled) and OPcache (enabled in `C:/php/php.ini`; without it, antivirus scanning makes each request take seconds).

## Run

```sh
cd backend/apps/api
php artisan migrate:fresh --seed   # fictional catalog + order history, password = DEMO_PASSWORD (demo-password)
php artisan serve --port=8100      # :8000 is used by Apache on this machine
php artisan test                         # Feature suite, in-memory SQLite, ~10 s
php artisan test --testsuite=Postgres    # real concurrency on the Neon test branch (needs DB_TEST_URL)
```

The shell (`frontend`, port 5000) proxies `/api`, `/auth` and `/sanctum` to port 8100, so the browser sees one origin and the Sanctum session cookie stays first-party.

## Demo accounts

| Email | Role |
| --- | --- |
| alex@demo.test | buyer (purchase CM-1001: Kubo processing, Daily Objects placed) |
| jamie@demo.test, robin@demo.test | buyers with seeded Kubo orders KL-1002 (placed), KL-1003 (shipped) |
| mara@demo.test | seller, Kubo Living (approved) |
| ben@demo.test | seller, Daily Objects (approved) |
| lia@demo.test | seller, Sari Studio (pending application APP-003) |
| nina@demo.test | seller, Habi Home (pending application APP-004) |
| admin@demo.test | admin |

## Endpoints so far

| Path | Access |
| --- | --- |
| `GET /sanctum/csrf-cookie`, `GET /auth/session`, `POST /auth/login`, `POST /auth/logout` | Shell session (API-11) |
| `GET /api/v1/products`, `GET /api/v1/products/{slug}` | Public, published products of approved sellers; q/category/seller/price/in_stock/sort (API-01) |
| `GET/PUT/DELETE /api/v1/cart...`, `POST /api/v1/checkout-attempts` (Idempotency-Key), `GET /api/v1/checkout-attempts/{key}`, `GET /api/v1/purchases[/{id}]` | Buyer, own records only (API-02..04) |
| `POST /api/v1/seller-orders/{id}/cancel` | Owning buyer or owning seller, before shipment (API-05) |
| `GET/POST /api/v1/seller/products`, `GET/PATCH /api/v1/seller/products/{id}`, `PATCH .../inventory`, `POST .../publish|unpublish` | Approved seller, own products, versioned writes (API-06/07) |
| `GET /api/v1/seller/orders[/{id}]`, `POST /api/v1/seller/orders/{id}/transitions` | Approved seller, own orders (API-08) |
| `GET /api/v1/admin/seller-applications[/{id}]`, `POST .../{id}/decision` | Admin: review and decide, reason required to reject (API-09) |
| `GET /api/v1/admin/products`, `POST /api/v1/admin/products/{id}/moderation` | Admin: unpublish with reason, clear restriction (API-10) |
| `GET /api/v1/admin/purchases[/{id}]` | Admin: read-only oversight (API-10) |

Errors are always `{ code, message, errors?, request_id }`; every response carries `X-Request-Id`.
