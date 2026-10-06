// Runnable check for the Pages Function proxy (pnpm check / CI): a fake upstream API on a local port.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { proxyToApi } from './proxy.js'

const seen = []
const upstream = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    seen.push({ method: req.method, url: req.url, headers: req.headers, body })
    res.setHeader('Set-Cookie', 'laravel-session=abc; path=/; httponly; samesite=lax')
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = req.url.startsWith('/missing') ? 404 : 200
    res.end(JSON.stringify({ ok: true }))
  })
})
await new Promise((r) => upstream.listen(0, r))
const env = { API_ORIGIN: `http://127.0.0.1:${upstream.address().port}` }

// POST with body, query string, cookies and client IP are forwarded; Set-Cookie comes back.
const post = await proxyToApi({
  env,
  request: new Request('https://cm-shell.pages.dev/auth/login?x=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'XSRF-TOKEN=t', 'CF-Connecting-IP': '203.0.113.7' },
    body: JSON.stringify({ email: 'alex@demo.test' }),
  }),
})
assert.equal(post.status, 200)
assert.match(post.headers.get('set-cookie'), /laravel-session=abc/)
assert.equal(seen[0].method, 'POST')
assert.equal(seen[0].url, '/auth/login?x=1')
assert.equal(seen[0].body, '{"email":"alex@demo.test"}')
assert.equal(seen[0].headers.cookie, 'XSRF-TOKEN=t')
assert.equal(seen[0].headers['x-forwarded-host'], 'cm-shell.pages.dev')
assert.equal(seen[0].headers['x-forwarded-proto'], 'https')
assert.equal(seen[0].headers['x-forwarded-for'], '203.0.113.7')

// Upstream status codes pass through unchanged.
const missing = await proxyToApi({ env, request: new Request('https://cm-shell.pages.dev/missing') })
assert.equal(missing.status, 404)

// A deployment without API_ORIGIN fails loudly instead of proxying somewhere unexpected.
const unconfigured = await proxyToApi({ env: {}, request: new Request('https://cm-shell.pages.dev/api/v1/products') })
assert.equal(unconfigured.status, 500)

upstream.close()
console.log('proxy ok')
