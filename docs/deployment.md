# Deploying the public demo (free, no card)

Topology from [zero-cost hosting](hosting-zero-cost.md): four Cloudflare Pages projects (shell + three remotes), the Laravel API on a Render free web service, and the Neon `production` branch as the database. The shell's Pages Functions proxy `/api`, `/auth` and `/sanctum` to Render, so browsers see one origin and the session cookie stays first-party (ADR-04).

Everything you need is in the repository: [`render.yaml`](../render.yaml), [`backend/apps/api/Dockerfile`](../backend/apps/api/Dockerfile), the proxy in [`frontend/apps/shell/functions`](../frontend/apps/shell/functions) and [`frontend/scripts/deploy-config.ts`](../frontend/scripts/deploy-config.ts). Nothing here has been deployed yet; the first deploy is also the first real test of the container and the Functions (both are covered by local checks only).

Never paste the database password into issues, chats or commits. It goes only into the Render dashboard.

## 0. Choose names (2 minutes)

Pick four Cloudflare Pages project names. Below they are `cm-shell`, `cm-storefront`, `cm-seller`, `cm-admin`. If a name is taken, Cloudflare adds a suffix: always use the real `*.pages.dev` address it shows you.

## 1. Neon `production` branch (3 minutes)

In the Neon console open the `common-market` project, select the `production` branch, click **Connect**, turn **Connection pooling off**, and note the host (`ep-…` without `-pooler`) and the password. The API migrates and seeds this branch itself on first start.

## 2. Render: the API (5 minutes)

1. Sign up at render.com with GitHub (free plan, no card).
2. **New → Blueprint**, choose the `common-market` repository. Render reads `render.yaml` and proposes the `common-market-api` web service (free, Singapore).
3. Fill in the values it asks for:
   - `APP_KEY`: run `php artisan key:generate --show` in `backend/apps/api` and paste the output (starts with `base64:`).
   - `DB_HOST`, `DB_PASSWORD`: from step 1.
   - `APP_URL`: `https://cm-shell.pages.dev`
   - `SANCTUM_STATEFUL_DOMAINS`: `cm-shell.pages.dev` (host only, no `https://`)
4. Create. The first build takes several minutes; then the log shows migrations, the demo seed and the server listening. Note the service URL, e.g. `https://common-market-api.onrender.com`, and check `https://…onrender.com/up` returns 200.

## 3. Cloudflare Pages: the three remotes (10 minutes)

Sign up at pages.cloudflare.com (free, no card). For each remote, **Create → Pages → Connect to Git → `common-market`**, then:

| Setting | Value (shown for `seller`; use `storefront` / `admin` for the others) |
| --- | --- |
| Project name | `cm-seller` |
| Framework preset | None |
| Root directory | `frontend/apps/seller` |
| Build command | `cd ../.. && npx -y pnpm@12 install --frozen-lockfile && npx -y pnpm@12 --filter @common-market/seller build && node --experimental-strip-types scripts/deploy-config.ts remote seller` |
| Build output directory | `dist` |
| Environment variables | `NODE_VERSION=22`, `SKIP_DEPENDENCY_INSTALL=true`, `REMOTE_ORIGIN=https://cm-seller.pages.dev`, `SHELL_ORIGIN=https://cm-shell.pages.dev` |

After the first deploy, under **Settings → Builds → Build watch paths**, include `frontend/apps/seller/*`, `frontend/packages/*`, `frontend/federation.shared.ts`, `frontend/pnpm-lock.yaml`, so a change to one remote does not redeploy the others (500 builds/month on the free plan).

## 4. Cloudflare Pages: the shell (5 minutes)

| Setting | Value |
| --- | --- |
| Project name | `cm-shell` |
| Root directory | `frontend/apps/shell` |
| Build command | `cd ../.. && npx -y pnpm@12 install --frozen-lockfile && npx -y pnpm@12 --filter @common-market/shell build && node --experimental-strip-types scripts/deploy-config.ts shell` |
| Build output directory | `dist` |
| Environment variables | `NODE_VERSION=22`, `SKIP_DEPENDENCY_INSTALL=true`, `STOREFRONT_ORIGIN=https://cm-storefront.pages.dev`, `SELLER_ORIGIN=https://cm-seller.pages.dev`, `ADMIN_ORIGIN=https://cm-admin.pages.dev`, `API_ORIGIN=https://common-market-api.onrender.com` |

Build watch paths: `frontend/apps/shell/*`, `frontend/packages/*`, `frontend/security.ts`, `frontend/scripts/*`, `frontend/pnpm-lock.yaml`.

If any real `*.pages.dev` address differs from the planned names, update the matching variables (remotes' `SHELL_ORIGIN`, shell's `*_ORIGIN`, Render's `APP_URL` and `SANCTUM_STATEFUL_DOMAINS`) and redeploy.

## 5. Try it

Open `https://cm-shell.pages.dev`. After 15 idle minutes the first request waits 30–60 s while Render and Neon wake up; that is expected on free plans. Sign in with **Use buyer**, **Use seller** or **Use administrator** (all fictional, password `demo-password`).

## Releases and rollback when hosted

- Releasing one remote: push a change under `frontend/apps/seller/`; only `cm-seller` rebuilds. The shell is untouched.
- Rolling back: in Cloudflare, open the remote's project → **Deployments** → previous deployment → **Rollback**. Pages deployments are immutable, which plays the role of the local `dist/<version>/` folders.
- Version bump: change `version` in the remote's `package.json`; the shell picks it up on its next build through `deploy-config.ts` (manifest).

## If something goes wrong

| Symptom | Check |
| --- | --- |
| Shell shows "temporarily unavailable" for a remote | Remote project deployed? `SHELL_ORIGIN` exactly the shell's https origin (CORS)? |
| Sign-in fails with 419 | `SANCTUM_STATEFUL_DOMAINS` on Render equals the shell host; `SESSION_SECURE_COOKIE=true` |
| `/api/...` returns "API_ORIGIN is not configured" | Set `API_ORIGIN` on the shell project (Production environment) and redeploy |
| Render deploy fails at migrate | `DB_HOST`/`DB_PASSWORD` from the `production` branch, direct (non-pooler) host |
| Free quota or limits reached | Pause the service; do not upgrade (CON-05). The local demo still works. |
