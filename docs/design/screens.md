# Screen inventory and Pencil build specification

Status: designed and visually inspected in Pencil. **18 screens / 36 primary frames** at 1440px desktop and 390px mobile. Foundations, component states, 14 exceptional states and contextual actions are separate boards.

Current Pencil target, saved by the user through Save As:
`C:\toDelete\portfolio-marketplace\common-market.pen`

Read/edit only through Pencil MCP. Preserve existing user frame(s); add Common Market sections in free canvas space. Do not replace the file using filesystem JSON.

## Frame naming and layout

Names: `UI-01 · Discovery · Desktop` and `UI-01 · Discovery · Mobile`, continuing stable IDs. Group headings: Foundations, Components, Buyer Journey, Seller Journey, Administration, Exceptional States. Add flow labels linking next/previous UI IDs and associated US/AC.

Arrange paired desktop/mobile frames in rows with 120px separation and generous section spacing. Confirm available canvas coordinates before inserting. Base desktop height 1000px, mobile 844px; extend height for longer workflows rather than clipping content. Photography and reusable components must be real canvas assets/nodes, not a screenshot pasted as the whole interface.

## Buyer

| UI | Story/criteria | Desktop composition | Mobile adaptation |
| --- | --- | --- | --- |
| UI-01 Discovery | US-01 / AC-01, AC-03 | Header/search; concise “Useful things, thoughtfully chosen”; category navigation; featured goods grid; quiet seller introduction | Search below header; compact category links; two-column grid with readable price/seller |
| UI-02 Filtered results | US-01 / AC-01, AC-02 | Sidebar filters; result heading/count; sort; applied chips; 3-column grid | Filter/sort controls open sheet; selected chips wrap above two-column results |
| UI-03 Product details | US-01 / AC-03 | Photo gallery left; title/seller/price/material/stock, quantity and Add to cart right; delivery fee and dimensions visible | Gallery first; product facts and action next; no oversized headline |
| UI-04 Cart | US-02 / AC-04, AC-05 | Seller-grouped rows left; summary right; visible delivery PHP 80 per seller | Groups stacked; line quantity/remove controls; summary below groups |
| UI-05 Checkout | US-03 / AC-06–AC-09 | Address form left; seller-grouped review right; demo outcome and explicit Place demo order | Form, groups and totals in order; final action follows grand total |
| UI-06 Confirmation | US-03 / AC-06 | CM-1001, demo success notice, two seller order summaries, total and Track purchase | Same content stacked; clear primary tracking action |
| UI-07 Buyer orders | US-04 / AC-10, AC-12 | Recent purchases list; date/amount/payment summary and seller fulfillment indicators | Purchase blocks with explicit labels and View purchase |
| UI-08 Purchase tracking | US-04 / AC-10, AC-11 | Two seller delivery panels with independent timelines and eligible cancellation; address/totals secondary | Seller panels stacked; cancellation available only on eligible order |

## Seller

| UI | Story/criteria | Desktop composition | Mobile adaptation |
| --- | --- | --- | --- |
| UI-09 Order queue | US-06 / AC-16 | Operational navigation; orders heading; placed/processing/shipped tabs; searchable queue, no decorative stat cards | Menu drawer; tabs; order rows with buyer/items/total/status labels |
| UI-10 Seller order | US-06 / AC-16, AC-17 | Order header and next action; line items, delivery address, total PHP 1,300 and event timeline | Order action after status; items/address/events stacked |
| UI-11 Product inventory | US-05 / AC-13–AC-15 | Product table with photo/title/SKU, price, stock, visibility and Edit; Add product | Search/filter and labeled product rows; stock and state visible |
| UI-12 Product editor | US-05 / AC-13, AC-15 | Main form and photo area; side publishing/stock section; Save changes for published goods, Save draft for new goods | Single labeled form; stock/publishing explanation near actions |

## Administration and shared

| UI | Story/criteria | Desktop composition | Mobile adaptation |
| --- | --- | --- | --- |
| UI-13 Approval queue | US-07 / AC-18 | Pending applications table with shop/contact/submitted/status and Review | Labeled application rows; clear Review action |
| UI-14 Application review | US-07 / AC-18 | Shop information, contact, sample category and history; decision area with reject reason | Content followed by decision actions and expandable reason |
| UI-15 Listing moderation | US-08 / AC-19 | Listings queue with seller/status/reason; contextual inspect/unpublish/clear restriction dialog | Search/status filters; product rows open detail sheet; explicit reason field |
| UI-16 Order oversight | US-08 / AC-20 | Purchase list with expandable seller orders, payment/fulfillment separate; selected CM-1001 details | Purchase rows then seller details; no horizontal table scroll |
| UI-17 Authentication | US-09 / AC-23 | Quiet wordmark, sign-in form, demo account chooser explaining seeded roles; no marketing split-screen | Same form with comfortable controls; retain safe return context |
| UI-18 Remote recovery | US-09 / AC-22 | Intact shell/navigation; affected area notice, retry and safe return | Intact mobile header, plain recovery message and actions |

All primary frames also map to US-10 / AC-24. Keyboard/screen-reader intent AC-25 belongs in component annotations and later implementation checks.

## Foundations and additional boards

Foundations, reusable components and interaction states, buyer/seller/admin section headings, exceptional states, access/recovery and contextual actions are present. Frame context annotations contain story/criteria IDs, next actions and intermediate responsive behavior. API ownership remains in the architecture and traceability documents. Motion is an implementation specification, not animated in this static artifact.

Do not claim interactive prototyping if Pencil supports only static frames. Label transitions as annotated flows until tool capability is verified. Inspect rendered screenshots after each workflow, correcting clipping, hierarchy, misplaced imagery and inconsistent totals.

## Completed canvas node inventory

[Machine-readable inventory](canvas-inventory.json) records frame geometry, traceability and image provenance. Existing user frame `bi8Au` is preserved.

| Screen | Desktop node | Mobile node |
| --- | --- | --- |
| UI-01 | `xAlMR` | `epkLW` |
| UI-02 | `KnVyi` | `h44SU` |
| UI-03 | `xSdU7` | `u2xwz` |
| UI-04 | `gebqo` | `i2KyU` |
| UI-05 | `L5Ix4` | `lkxIU` |
| UI-06 | `c3fPK9` | `cbkkV` |
| UI-07 | `wrWfI` | `w3iTWC` |
| UI-08 | `rAqyT` | `G5GWfh` |
| UI-09 | `mcegI` | `IIjHV` |
| UI-10 | `fegja` | `SThmZ` |
| UI-11 | `NBrw4` | `FupXu` |
| UI-12 | `Akbu0` | `Tglb9` |
| UI-13 | `O0VHhO` | `mACUr` |
| UI-14 | `OXEIZ` | `src32` |
| UI-15 | `c9VpR` | `JwIyi` |
| UI-16 | `ljKjT` | `C4d0M` |
| UI-17 | `iDkvv` | `eXJJt` |
| UI-18 | `VKPyl` | `TKcah` |

[Preview exports](../../exports/README.md) provide representative PNGs. All flows are static annotations, not a functioning prototype.
