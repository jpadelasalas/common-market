# User stories and acceptance criteria

Acceptance criteria are proposed specifications derived from approved scope. All scenarios use fictional demo data.

## US-01: Discover goods (REQ-03)

Buyer finds products that meet their needs.

- AC-01: Given published goods, when a buyer searches or filters, then matching products, result count, selected filters and clear-all are visible; filters survive opening a product and returning.
- AC-02: Given no results or a failed request, when the results view renders, then it explains the state and offers clear filters or retry without losing the query.
- AC-03: Given a product, when opened, then price, seller, stock availability, dimensions/materials, delivery fee and quantity limits are available before adding it. Unpublished products cannot be purchased.

## US-02: Review a multi-seller cart (REQ-04)

Buyer understands what each seller supplies and the final total.

- AC-04: Given products from two sellers, when the cart opens, then it groups line items and one delivery fee per seller and shows item subtotal, delivery total and grand total.
- AC-05: Given quantity changes, unavailable stock or price changes, when recalculated, then server values replace stale values and the buyer is informed; unresolved conflicts prevent checkout.

## US-03: Checkout safely (REQ-05, REQ-11)

Buyer completes a clearly labeled demo purchase.

- AC-06: Given valid cart/address and simulated success, when submitting, then one purchase and one order per seller are created, stock allocated atomically and authoritative totals displayed.
- AC-07: Given simulated failure or field validation failure, when submitting, then no purchase is created and stock is unchanged; entered address/cart remain with actionable feedback.
- AC-08: Given repeated requests with the same key and payload, when submitted concurrently, then one purchase is created; the same key with a different payload yields a conflict.
- AC-09: Given two buyers competing for the last item, when checkout executes concurrently, then at most one allocation succeeds and the other receives a stock conflict.

## US-04: Track/cancel orders (REQ-06, REQ-11)

Buyer follows each seller delivery independently.

- AC-10: Given a purchase with two seller orders, when viewing tracking, then each has its own status, items, fee and timeline; progress is not flattened into a misleading single status.
- AC-11: Given a placed/processing order, when cancelled, then stock is restored once and demo payment adjustment recorded; a shipped/delivered order rejects cancellation with an explanation.
- AC-12: Given another buyer's purchase identifier, when requested, then no details are exposed.

## US-05: Maintain products (REQ-07)

Approved seller maintains only their own catalog and stock.

- AC-13: Given valid product input, when saving, then the record remains a draft until published; draft/published status is visible and required fields have labeled errors.
- AC-14: Given a seller, when accessing another shop's records, then the request is denied without exposing protected data.
- AC-15: Given negative stock or a stale inventory version, when saving, then the update is rejected and recovery preserves entered changes.

## US-06: Fulfill seller orders (REQ-07)

Seller processes and ships their portion of a purchase.

- AC-16: Given a placed order, when processing then shipping, then only allowed transitions succeed and buyer tracking updates; another seller's order cannot be modified.
- AC-17: Given a shipped order, when seller marks delivery, then a timestamped delivered event is added; reverse/duplicate transitions are rejected or safely replayed.

## US-07: Approve sellers (REQ-08)

Admin reviews pending seller applications.

- AC-18: Given a pending application, when approving or rejecting, then decision and actor are audited; rejection needs a visible reason; buyers/sellers cannot call the approval API.

## US-08: Moderate and oversee (REQ-08)

Admin controls listing visibility and inspects operational problems.

- AC-19: Given a published listing, when admin unpublishes with a reason, then it disappears from browsing while historical order snapshots remain intact.
- AC-20: Given an admin order list, when filtering/opening a purchase, then seller status and demo payment status remain separate; oversight does not grant unrestricted transition shortcuts.

## US-09: Integrate microfrontends (REQ-01, REQ-09)

Developer proves deployment independence without breaking the experience.

- AC-21: Given a compatible remote release, when independently deployed, then the existing shell loads it without a shell rebuild; rollback restores the earlier release.
- AC-22: Given an unavailable/incompatible remote, when its route is opened, then shell navigation stays usable with retry/back actions, and data is not silently discarded.
- AC-23: Given sign-in/session expiry, when crossing remote boundaries, then one session is used and protected requests remain backend-authorized; expiry offers sign-in preserving a safe internal return path.

## US-10: Use the product across devices (REQ-10, REQ-12)

Users complete the same task on desktop and mobile.

- AC-24: Given each primary workflow, when viewed at 1440px or 390px, then its content, actions and recovery states remain legible with no unintended horizontal scrolling.
- AC-25: Given implementation, when keyboard/screen-reader checks run, then labels, focus, error announcements and dialog behavior support the agreed accessibility target. Static mockups alone cannot verify this.
