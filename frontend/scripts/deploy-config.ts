// Writes deployment-only files into a built app's dist/ for Cloudflare Pages (docs/deployment.md).
//
//   node --experimental-strip-types scripts/deploy-config.ts shell
//     env STOREFRONT_ORIGIN, SELLER_ORIGIN, ADMIN_ORIGIN  (e.g. https://cm-seller.pages.dev)
//     → manifest.json (runtime remote selection), _headers (CSP and security headers),
//       _routes.json (only /api, /auth, /sanctum invoke Functions, saving the free quota)
//
//   node --experimental-strip-types scripts/deploy-config.ts remote <storefront|seller|admin>
//     env SHELL_ORIGIN  → _headers (CORS so the shell may import this remote, caching)
//
// The local demo never runs this; it uses public/manifest.json and vite preview headers.
import { readFileSync, writeFileSync } from 'node:fs'
import { shellHeaders } from '../security.ts'

const REMOTES = ['storefront', 'seller', 'admin'] as const
type Remote = (typeof REMOTES)[number]

const root = new URL('..', import.meta.url)
const path = (p: string) => new URL(p, root)

function origin(name: string): string {
  const value = process.env[name]?.replace(/\/$/, '')
  if (!value || !/^https:\/\/[a-z0-9.-]+$/i.test(value)) {
    throw new Error(`${name} must be an https origin such as https://cm-seller.pages.dev (got "${value ?? ''}")`)
  }
  return value
}

const version = (app: Remote): string => JSON.parse(readFileSync(path(`apps/${app}/package.json`), 'utf8')).version

const headersFile = (rules: Record<string, Record<string, string>>) =>
  Object.entries(rules)
    .map(([pattern, headers]) => [pattern, ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`)].join('\n'))
    .join('\n\n') + '\n'

function shell() {
  const origins = Object.fromEntries(REMOTES.map((r) => [r, origin(`${r.toUpperCase()}_ORIGIN`)])) as Record<Remote, string>
  const manifest = {
    remotes: Object.fromEntries(
      REMOTES.map((r) => [r, { entry: `${origins[r]}/${version(r)}/remoteEntry.js`, version: version(r), contractMajor: 1 }]),
    ),
  }
  const dist = (f: string) => path(`apps/shell/dist/${f}`)
  writeFileSync(dist('manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  writeFileSync(
    dist('_headers'),
    headersFile({
      '/*': shellHeaders(Object.values(origins)),
      // The manifest is deployment config: always revalidate so releases and rollbacks apply at once.
      '/manifest.json': { 'Cache-Control': 'no-store' },
    }),
  )
  writeFileSync(dist('_routes.json'), JSON.stringify({ version: 1, include: ['/api/*', '/auth/*', '/sanctum/*'], exclude: [] }, null, 2) + '\n')
  console.log(`shell: manifest for ${REMOTES.map((r) => `${r}@${version(r)}`).join(', ')}`)
}

function remote(app: string | undefined) {
  if (!REMOTES.includes(app as Remote)) throw new Error(`remote must be one of ${REMOTES.join(', ')}`)
  const shellOrigin = origin('SHELL_ORIGIN')
  const v = version(app as Remote)
  writeFileSync(
    path(`apps/${app}/dist/_headers`),
    headersFile({
      // Only the shell may load this remote's modules (module scripts are fetched with CORS).
      '/*': { 'Access-Control-Allow-Origin': shellOrigin, 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' },
      // Hashed chunks never change; the entry is revalidated so a redeploy of a version is picked up.
      [`/${v}/assets/*`]: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      [`/${v}/remoteEntry.js`]: { 'Cache-Control': 'no-cache' },
    }),
  )
  console.log(`${app}@${v}: headers allow ${shellOrigin}`)
}

const [mode, app] = process.argv.slice(2)
if (mode === 'shell') shell()
else if (mode === 'remote') remote(app)
else throw new Error('usage: deploy-config.ts shell | remote <storefront|seller|admin>')
