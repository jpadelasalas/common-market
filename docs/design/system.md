# Design rationale and system

Status: applied to the editable Common Market canvas; desktop/mobile screenshots inspected.

## Direction

Common Market presents useful home/everyday goods with a calm, product-led interface. Use disciplined hierarchy inspired by Geist, but compose shopping around products, seller identity and decision-making. Seller/admin workspaces use denser task-driven layouts. Shared tokens and behaviors connect the experiences without forcing identical composition.

No oversized marketing hero, decorative gradient, repeated KPI cards, invented sales statistics or promotional urgency. The storefront opening view should show search, useful categories and actual goods. Photography communicates shape/material; labels communicate price, seller and availability.

Geist informs consistency, typography and contrast. Baymard informs visible/removable filter context; neither establishes that these designs have passed user testing. [Geist](https://vercel.com/geist/introduction), [Baymard](https://baymard.com/research-articles/how-to-design-applied-filters)

## Foundations

[Machine-readable tokens](tokens.json) are the source for values. Color swatches on Pencil must include name/hex and computed contrast notes.

Typography: Geist Sans; system sans fallback if unavailable. Weights 400/500/600. Body 16px/24px; compact operational text 14px/20px; labels 14px/20px; page heading 32px/40px; mobile heading 26px/32px. Monospaced/tabular numerals for order IDs and compared amounts. Do not use low-contrast gray for essential price/delivery text.

Spacing: 4, 8, 12, 16, 24, 32, 48, 64px. Small 4px/8px radii; pill radius reserved for filter chips/status labels. Border-first separation; elevation only for overlays. Motion 120ms feedback, 200ms disclosure; reduced-motion disables nonessential motion.

## Responsive composition

| Width | Buyer | Seller/admin |
| --- | --- | --- |
| ≥1200 | 1312px storefront content at 1440px; 64px outer gutters; 4-column product grid; filters beside results | 224px navigation, flexible main area; tables with right-aligned amounts |
| 768–1199 | 24px gutters; 2–3 columns; narrower filters or drawer; detail stacks when necessary | Collapsible navigation; priority columns and row detail disclosure |
| <768 | 16px gutters; 2 product columns; search full width; filters in bottom sheet; details single column | Menu drawer; lists with stacked row content and labeled totals |

Primary Pencil desktop width 1440, mobile 390. Height follows content; avoid clipping content to create a false polished screenshot. At mobile widths keep critical prices, seller names, delivery costs and order actions visible. No table-wide horizontal scrolling for core tasks.

## Interaction/accessibility intent

- Labels persist above fields; required fields identified in text.
- Errors identify the field/problem and recovery; keep entered values.
- Focus uses visible 2px deep-green outline with 2px offset; verify implementation.
- Prefer 44px comfortable touch controls; compact desktop rows may use smaller controls with accessible spacing.
- Selected status/filter includes text and icon/check, never color alone.
- Dialogs have explicit titles, Cancel and specific action labels.
- Product image alt text identifies product/material; decorative repeats use empty alt.
- Totals and updates need appropriate live announcements in implementation.
- Verify text and necessary UI contrast against WCAG AA targets; static artifact is not a compliance claim.
- No dark theme in v1. Avoid forcing irrelevant loading/empty states onto every button.

## Photography and content

Use authentic-looking studio/lifestyle product photographs with uncluttered warm backgrounds and consistent cropping, not placeholder gradients. Record source/licensing or generation provenance when assets are placed. Never fabricate images being present.

Copy examples: Add to cart; Review order; Place demo order; Start processing; Mark shipped; Reject application; Unpublish listing. Use Buyer/Seller/Admin as documentation roles, not architecture terminology in product copy.

A discrete demo notice explains that purchases/payments/delivery are simulated. No exposure of federation manifests, remote contract versions or stack details in ordinary product flows.
