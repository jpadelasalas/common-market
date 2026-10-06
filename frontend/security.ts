// Shell security headers (security matrix), shared by local `vite preview` and the deployed
// Cloudflare Pages `_headers` file so both enforce the same policy.

/** Scripts only from the shell and the allowlisted remote origins; no inline scripts. Styles allow
 * inline because remotes inject their CSS at runtime. */
export function contentSecurityPolicy(remoteOrigins: string[]): string {
  const remotes = remoteOrigins.join(' ')
  return [
    "default-src 'self'",
    `script-src 'self' ${remotes}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${remotes}`,
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: https://images.unsplash.com",
    `connect-src 'self' ${remotes}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

export const shellHeaders = (remoteOrigins: string[]) => ({
  'Content-Security-Policy': contentSecurityPolicy(remoteOrigins),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
})
