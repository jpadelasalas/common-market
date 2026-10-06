// Cloudflare Pages Function shared by /api, /auth and /sanctum (see functions/). Forwards the request
// to the Laravel API so the browser only ever talks to the shell's origin: Sanctum's session cookie
// stays first-party without a purchased domain (ADR-04). Mirrors the vite preview proxy used locally.
export async function proxyToApi({ request, env }) {
  const origin = env.API_ORIGIN // e.g. https://common-market-api.onrender.com
  if (!origin) return new Response('API_ORIGIN is not configured for this deployment.', { status: 500 })

  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, origin)

  const headers = new Headers(request.headers)
  headers.delete('host')
  // Laravel trusts these (trustProxies) to know the public host, scheme and client IP.
  headers.set('X-Forwarded-Host', incoming.host)
  headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''))
  const client = request.headers.get('CF-Connecting-IP')
  if (client) headers.set('X-Forwarded-For', client)

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Streaming a request body requires half-duplex per the Fetch standard.
    ...(hasBody && { duplex: 'half' }),
    redirect: 'manual',
  })
  // Pass status, body and headers (including Set-Cookie) straight through.
  return new Response(upstream.body, upstream)
}
