# Spec gaps and findings

2026-10-05. Documentation and static design are delivered; application implementation follows later.

| ID | Status / severity | Gap | Handling |
| --- | --- | --- | --- |
| GAP-01 | Resolved | Pencil MCP/editor connection | MCP successfully opened common-market.pen, read tool guidance and edited/inspected the canvas. Existing frame bi8Au preserved. |
| GAP-02 | Open / Medium | Database remains proposed | PostgreSQL documented, not installed; confirm before migrations. |
| GAP-03 | Open / Medium | Deployment provider unresolved; budget confirmed zero | Provider-independent artifacts/manifests specified; verify non-trial free backend persistence/session topology; real hosting deferred. |
| GAP-04 | Resolved for design / Medium | Product photo acquisition | Six Unsplash images placed with author/source metadata in [canvas inventory](design/canvas-inventory.json). Illustrative images need replacement with exact product photography for a real store. Remote image availability/offline packaging is not guaranteed. |
| GAP-05 | Open / Medium | API/data outline is not exhaustive OpenAPI/schema | Generate and validate contracts before app implementation. |
| GAP-06 | Open / Low | No confirmed capacity/timeline | Proposed NFRs only; no production SLA claimed. |
| GAP-07 | Open / Medium | Usability not tested with people | Screenshot checks are visual review; evaluate key tasks later. |
| GAP-08 | Proposed / Low | Fictional locales/shipping/account defaults | English, PHP and fictional addresses remain explicit planning defaults. |

## Resolved connection history

Earlier MCP calls could not see the user-opened pencil-new.pen. Updating the configured server to the installed extension executable did not alone restore access. Extension logs subsequently confirmed EADDRINUSE on the shared pencil-visual_studio_code pipe, with another VS Code window owning the listener.

After the project was relocated and the marketplace document reopened, MCP access succeeded at C:\toDelete\portfolio-marketplace\common-market.pen. All design changes used Pencil MCP; the encrypted file was never read or replaced through filesystem tools. The prior blocked reports describe earlier attempts, not the current deliverable.

See [verification](verification.md) for completed documentation and design checks, and unexecuted runtime checks.
