# Component specifications

All components use [tokens](tokens.json). Define shared behavior once; vary layouts where tasks differ.

| Component | Anatomy/variants | Relevant states and accessibility |
| --- | --- | --- |
| CMP-01 Header/navigation | Wordmark, search, categories, cart/order/account; compact mobile header; operations navigation | Current route text/indicator; focus; mobile drawer with dismissal and focus return |
| CMP-02 Button | Primary deep green, secondary outlined, text, destructive; optional icon | Default/hover/focus/pressed/disabled/busy; busy label preserves width and prevents duplicates |
| CMP-03 Field/select | Visible label, required marker, control, description/error | Empty/filled/focus/disabled/error; related error ID; 44px controls; no placeholder-only labels |
| CMP-04 Product tile | Reserved photo area (290px desktop / 210px mobile tiles), product name, seller, price, stock text where relevant | Normal/unavailable/image-loading; title is the main link; no hidden price on hover |
| CMP-05 Filters | Search, category, price, seller, available stock, sort; chips/count | Selected removable chips, clear-all, empty result; mobile sheet applies selections predictably |
| CMP-06 Quantity | Decrease/value/increase with visible min/max behavior | Disabled boundaries, updating, stock error; explicit labels per product |
| CMP-07 Seller cart group | Seller title, rows, delivery line, seller subtotal | Recalculating/out-of-stock/price-changed; seller grouping persists on mobile |
| CMP-08 Order summary | Item subtotal, per-seller delivery, grand total, demo notice/action | Review/pending/failure; totals in text; action never obscures shipping costs |
| CMP-09 Status/timeline | Text badge plus icon; events with time/actor | Payment and fulfillment variants separate; status always readable without color |
| CMP-10 Work queue/table | Search, useful filters/tabs, labeled columns, count, pagination | Loading/empty/error/stale; amounts right aligned; mobile labeled rows open details |
| CMP-11 Dialog/sheet | Title, explanation, reason if needed, Cancel, named action | Validation/saving/failure; keyboard focus trap and restore in implementation |
| CMP-12 Inline notice | Icon, specific message, optional retry/correction action | Info/success/warning/error; concise; live region only when dynamic |
| CMP-13 Photo gallery | Main photo, thumbnail selection, material/detail photos | Loading/failure; meaningful alt; controls usable without swiping |
| CMP-14 Remote recovery | Within intact shell; explanation, Retry and Back to shopping/workspace | Loading/failed/retrying; no technical stack jargon or blank page |

## Shared dimensions and behavior

Buttons/input heights 44px; dense desktop secondary controls 36px only where justified. Product tiles use 16px internal gaps rather than heavy outer boxes/shadows. Operations rows 64px desktop; mobile expands to fit labeled information. Dialog widths max 480px, inset 16px on mobile.

Cart quantity writes are serialized per line; totals display an updating state and cannot be submitted stale. On checkout conflict, highlight affected line and provide Return to cart. A busy submission does not allow repeated clicks, but backend idempotency still protects retries.

Tabs navigate queues without discarding filters; URL stores non-sensitive search/filter state. Dialog cancellation does not commit any changes. Destructive listing actions require a reason and clear consequences; avoid confirmation for harmless navigation.

## Exceptional state board

The Exceptional states board contains the following contextual examples:

1. Product results skeleton with reserved photo/text geometry.
2. No matching products with Clear filters.
3. Empty cart with Browse goods.
4. Invalid checkout postcode/address with inline correction.
5. Stock conflict showing requested vs available quantity.
6. Demo payment failure retaining review/address and Retry demo payment.
7. Session expired with safe sign-in return.
8. Permission denied with Back to workspace.
9. Stale stock edit showing current value and preserved edit.
10. Remote unavailable with intact header/navigation and retry.
11. Moderation rejection with required reason error.
12. Image unavailable with readable product name and stable geometry.

Screenshot review can verify layout and intended states; keyboard operation, ARIA behavior and network retry semantics require app implementation.

Additional states: EX-13 retains a failed search query/filters and provides Retry search; EX-14 reconciles an unknown checkout outcome using the existing attempt before allowing another submission. The contextual actions board adds seller rejection, clearing a listing restriction, and a mobile workspace drawer. The Components board includes focus, hover, disabled/busy buttons, fields, payment/fulfillment badges, filters, cancellation, and a new draft product.

Pencil uses Geist for general text and Geist Mono for compared amounts/purchase references. CSS tabular numerals and focus/announcement behavior remain implementation requirements.
