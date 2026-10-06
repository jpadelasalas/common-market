# Zero-cost constraint and hosting options

## Confirmed restriction

CON-05: the portfolio must require no additional monetary spending. No paid hosting, purchased domain, paid database/storage, paid API, subscription, expiring trial credit dependency, or automatic paid overage. Use existing equipment and internet access. Existing service costs are not a new project purchase.

When a free quota is exhausted, pause the affected deployment/service, reduce usage or use the local demo. Do not upgrade or enable billing automatically. A provider's future pricing cannot be guaranteed; review current terms before deployment. No provider account or deployment has been created.

## Architecture retained

One repository; shell plus storefront, seller and administration remain separately built and independently deployable. Laravel remains the backend modular monolith; PostgreSQL remains the proposed database. A zero budget does not require merging frontend builds or replacing backend authorization.

Independent deployability means separate release artifacts and release jobs; it does not require four purchased servers.

## Proposed baseline

| Part | Zero-cost approach | Status |
| --- | --- | --- |
| Development and full-stack walkthrough | Run four frontend apps, Laravel and PostgreSQL on existing computer | Proposed implementation baseline |
| Public shell and remote assets | Cloudflare Pages Free; four projects from the same repository, provider subdomains | Proposed; no account/deployment configured |
| Persistent public Laravel API and database | Select only after verifying a non-trial free offering, quotas, persistence and session topology | Open; no always-on service promised |
| Public browser-only walkthrough | Optional seeded demo adapter, visibly identified as simulated; Laravel backend still developed and tested locally | Proposal only; requires a separate product decision before implementation |
| Domain and assets | Provider subdomain; suitable free/open assets with recorded provenance | No purchases |
| Build/release automation | Local release commands initially; hosted CI only within verified free quotas | Proposed |

Cloudflare Pages supports multiple projects from a monorepo and has a Free plan with build/file/project limits. Its documentation currently lists 500 builds per month and one concurrent build. Configure build watch paths so an unrelated change does not release every remote. Versioned remote assets and a runtime deployment manifest still enable independent release and rollback.

Sources: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Monorepo configuration](https://developers.cloudflare.com/pages/configuration/monorepos/). Checked 2026-10-05; verify again at deployment.

Cloudflare Pages static hosting is not a PHP/Laravel runtime. A public static frontend does not by itself establish a public full-stack application.

Render illustrates why a free label is insufficient: free web services sleep after inactivity; its free PostgreSQL databases expire after 30 days. That database is unsuitable as the persistent zero-cost default. [Render free services](https://render.com/docs/free).

## Full-stack hosting acceptance gate

Before selecting a public backend provider, verify PHP/container support, durable database lifetime, storage/reset behavior, idle suspension, network limits, billing behavior and browser session/cookie topology. Preserve the selected Sanctum first-party session model; do not assume unrelated provider subdomains meet that model. A purchased custom domain cannot be required to make the topology work.

If no suitable free backend is established, document and demonstrate the real full-stack application locally. A public mock walkthrough is optional and must not claim server-side authorization, atomic stock allocation or duplicate-checkout guarantees. Local integration tests provide evidence of those backend behaviors.

## Portfolio evidence

Demonstrate independent remote release and rollback, intact-shell failure recovery and local Laravel ownership/transaction tests. Record which public features call the actual backend versus a demo adapter. Do not claim production availability or unlimited free resources.

Add TC-14: review dependencies and deployment settings against CON-05; confirm no trial-credit dependency, paid plan or automatic paid fallback. Actual billing behavior is verified only when accounts/services are configured.

## Update 2026-10-06: backend comparison and recommended topology

The database is now settled: Neon Free (PostgreSQL 18, Singapore, no card, scales to zero, no expiry) already runs the dev branch; its untouched `production` branch is reserved for public hosting. The open question is only the Laravel runtime.

| Option (free tier, checked 2026-10-06) | Card needed | Fit | Main caveat |
| --- | --- | --- | --- |
| Render free web service (Docker) | No | Good: Docker image of the Laravel API, Singapore region near Neon | Sleeps after 15 min idle, 30–60 s cold start; 512 MB / 0.1 CPU; no persistent disk (use database sessions on Neon); bandwidth reduced to 5 GB/month in 2026 |
| SnapDeploy free containers | No | Possible | Newer provider; 100 container-hours/month; less track record |
| Wasmer (Laravel hosting) | No | Possible | WebAssembly PHP runtime; extensions/PDO pgsql support must be verified first |
| Koyeb | Yes since Feb 2026 ($29 hold) | Excluded by CON-05 | Card and paid plan now required |
| Laravel Cloud | No, but trial credit | Excluded by CON-05 | $5 credit runs out (trial-credit dependency) |

Recommendation (proposal; no account or deployment created):

- Frontend: Cloudflare Pages Free, one project per app (shell, storefront, seller, admin) so remotes deploy independently; unlimited bandwidth, 500 builds/month. Remote artifacts keep their versioned folders; the shell's `manifest.json` selects releases (rollback = manifest change).
- API: Render free web service (Docker) in Singapore, pointed at the Neon `production` branch, `SESSION_DRIVER=database`.
- Session topology (ADR-04): browsers must see one origin. Add a Cloudflare Pages Function on the shell project that proxies `/api`, `/auth` and `/sanctum` to the Render service, exactly as `vite preview` does locally. Cookies stay first-party on the `*.pages.dev` shell origin; no purchased domain is needed. Pages Functions run on the Workers free quota; verify the current request limit before relying on it.
- Honest expectations: the first request after 15 idle minutes waits for Render to wake (30–60 s) and Neon to resume; label the demo as such. Security headers: move the shell CSP from `vite preview` into the shell's `_headers` file with the real remote origins.

Sources: [Render free tier](https://render.com/docs/free), [Render 2026 plan changes](https://agentdeals.dev/vendor/render), [Koyeb card requirement](https://www.srvrlss.io/provider/koyeb/), [no-card PHP hosting overview](https://www.deployhq.com/blog/how-to-deploy-a-php-website-for-free), [Wasmer Laravel hosting](https://wasmer.io/laravel-hosting), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/). Re-verify all terms at deployment time (TC-14).
