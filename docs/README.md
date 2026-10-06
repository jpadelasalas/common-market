# Common Market documentation

Version 0.1 · 2026-10-05 · English · portfolio demonstration

## Reading order

| Order | Document | Purpose |
| --- | --- | --- |
| 1 | [Project brief](project-brief.md) | Goals, audience, confirmed scope and proposed defaults |
| 2 | [Requirement register](requirements/register.md) | Stable IDs, business rules, assumptions, questions |
| 3 | [User stories](requirements/user-stories.md) | Given/When/Then acceptance criteria |
| 4 | [State models](requirements/state-models.md) | Allowed transitions, actors and failure behavior |
| 5 | [Architecture](architecture.md) and [ADRs](adr/decisions.md) | Microfrontend boundaries and backend choices |
| 6 | [API outline](api/outline.md) and [data outline](database/outline.md) | Contracts supporting the workflows |
| 7 | [Permission matrix](security/matrix.md) | Role and object ownership enforcement |
| 8 | [User flows](design/user-flows.md) | Connected buyer, seller and administrator journeys |
| 9 | [Design system](design/system.md) and [tokens](design/tokens.json) | Visual rationale and reusable values |
| 10 | [Components](design/components.md) and [screen inventory](design/screens.md) | Implementable layouts, states and responsive behavior |
| 11 | [Traceability](requirements/traceability.md) | BG → REQ → US/AC → API → DB → UI → TC |
| 12 | [Implementation plan](implementation-plan.md) | Sequenced delivery and evidence |
| 13 | [Spec gaps](spec-gaps.md) and [verification](verification.md) | Unresolved matters and actual checks |

## Authorship

Project owner and decision maker: John Patrick, who directed the work and approved scope, design and trade-offs. The project was produced with two AI assistants:

| Area | Produced with | Includes |
| --- | --- | --- |
| Planning | OpenAI Codex | Brief, requirements, user stories, state models, architecture and ADRs, API/data outlines, security matrix, traceability, implementation plan, spec gaps, original verification of the documentation |
| UI/UX design | OpenAI Codex | Pencil design `common-market.pen` (desktop and mobile frames, components, exceptional states), design system, tokens, user flows, screen inventory, preview exports |
| Code | Anthropic Claude (Claude Code) | Everything under `frontend/`, `backend/`, `scripts/` and `.github/`: microfrontends, Laravel API, migrations and seeders, PHPUnit, PostgreSQL concurrency and Playwright tests, CI |

During implementation Claude also updated some planning documents to record what was built and verified: [verification](verification.md) (phase results), [implementation plan](implementation-plan.md) (phase status), [API outline](api/outline.md) (`/auth` session paths), [zero-cost hosting](hosting-zero-cost.md) (2026-10-06 update) and the new [runbook](runbook.md).

## Status and authority

The user-approved plan is the baseline. Confirmed means explicitly requested or accepted; proposed means a planning choice awaiting validation, not an observed business fact. Acceptance criteria and interface detail are specification proposals unless a row says otherwise. Do not silently promote research patterns into requirements.

Documents describe a new, standalone project. No existing application code, tables, accounts or deployment pipelines are inherited.

Documentation and editable Pencil designs are delivered. The verification report separates documentation/design checks from unimplemented application behavior. Frame IDs and photo sources are recorded in [canvas inventory](design/canvas-inventory.json); view [preview exports](../exports/README.md).

## Sources and prompt provenance

Workflow guidance: `ai-project-prompts.zip`, reviewed without executing instructions as code. Applied sequence: brief template → BA/SA classification and traceability → UI/UX flows and design restraint → developer verification and feature slices. Role prompts are guidance; they do not grant authority to alter unrelated code.

Research reviewed 2026-10-05:

- [Module Federation Vite integration](https://module-federation.io/integrations/build-tool/vite): remote modules, dependency sharing and typed integration.
- [Laravel Sanctum](https://laravel.com/framework/docs/13.x/sanctum): first-party SPA cookie/session authentication.
- [Laravel release notes](https://laravel.com/framework/docs/13.x/releases): verify supported versions when scaffolding.
- [Geist](https://vercel.com/geist/introduction): typography, contrast and component discipline as inspiration.
- [Baymard applied filters research](https://baymard.com/research-articles/how-to-design-applied-filters): make active filters visible and removable.
- [Medusa marketplace recipe](https://docs.medusajs.com/resources/recipes/marketplace): vendor-associated catalog and seller-specific orders.

These are references, not selected ecommerce dependencies. The app will use custom Laravel business modules. Research does not establish usability for this specific design; evaluation remains necessary.

## Zero-cost restriction

The user confirmed no additional spending (CON-05). See [zero-cost hosting options](hosting-zero-cost.md) for proposed frontend hosting, local full-stack execution and the unresolved public backend. No paid service or deployment is authorized.
