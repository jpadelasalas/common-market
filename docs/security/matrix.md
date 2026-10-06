# Role, ownership and security matrix

Proposed v1 security requirements. No regulatory applicability or compliance certification is asserted for this fictional portfolio.

| Capability | Public | Buyer | Seller | Admin | Server enforcement |
| --- | --- | --- | --- | --- | --- |
| Published product browsing | Yes | Yes | Yes | Yes | Published scope; private columns excluded |
| Cart and checkout | No | Own | No | No | Session + buyer cart policy + stock validation |
| Purchase details | No | Own | Own order portion | Oversight | Buyer/seller scoping before serialization |
| Product/stock writes | No | No | Own shop | Moderation only | Approved seller and ownership/version checks |
| Fulfillment transitions | No | Cancellation only | Own orders | Read oversight | Central state guard and ownership |
| Seller decisions | No | No | No | Yes | Admin policy + review audit |
| Moderation | No | No | No | Yes | Admin policy + reason/version check |
| Session | Sign-in | Own | Own | Own | Secure session cookie, CSRF, logout invalidation |

Admin does not automatically get arbitrary inventory edits, shipping transitions or unrestricted cancellation. Do not infer permission from a role switch UI. Demo accounts are separate sessions; sign out before switching.

## Trust boundaries and threats

| Risk | Control | Verification |
| --- | --- | --- |
| Seller accesses another seller's order | Policies + query scoping + response allowlist | TC-07 direct-ID and nested-path checks |
| Price tampering/overselling | Server totals, transactional locks, constraints | TC-03, TC-04 |
| Duplicate submit/cancel | Unique attempt and adjustment keys, locking | TC-03, TC-05 |
| Session theft/CSRF | Sanctum sessions, Secure/HttpOnly cookie, CSRF writes, narrow origins | TC-11 |
| Remote substitution/incompatible release | Asset allowlist, immutable manifest targets, contract version, CSP | TC-10 |
| Listing content XSS | Context-safe output; no raw rich HTML in v1 | TC-12 |
| Sensitive data exposure | Minimal DTOs, no credentials/address in logs or fixtures containing real data | TC-07, TC-12 |

Validate boundary inputs and parameterize database queries. Store secrets only in environment/secret storage, never docs or browser bundles. Future uploads require server type/size checks and safe storage; current demo uses seeded image references.

Proposed throttles, subject to testing: login 5/minute per normalized account+IP; checkout 10/minute per buyer; public search 60/minute per IP. Rate limit and authentication errors must not expose account existence. Return 429 with Retry-After. These numbers are proposals, not production sizing.

Audit moderation, approval, inventory changes and order transitions with actor/entity/time/request ID and safe changed fields. No passwords, session tokens or full shipping addresses in logs. Proposed security headers include CSP with specific remote asset origins, frame-ancestors restriction and production HSTS over HTTPS.

Screen-reader, keyboard, focus, contrast and error announcements are checked at implementation. Do not label the app secure or accessible based only on static mockups.
