import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import { shared } from '../../federation.shared'

// Remotes are not listed here: the shell reads them from public/manifest.json at runtime,
// so releasing or rolling back a remote never rebuilds the shell.
// One browser origin for the SPA and Laravel so Sanctum's session cookie stays first-party (ADR-04).
// ponytail: fixed local Laravel origin (`php artisan serve --port=8100`; :8000 is taken by Apache here); make configurable when hosting is chosen.
const api = 'http://localhost:8100'
const proxy = { '/api': api, '/auth': api, '/sanctum': api }

// Security matrix: scripts only from the shell and the allowlisted remote asset origins. Styles allow
// inline because remotes inject their CSS at runtime; no inline scripts are needed or allowed.
const remoteOrigins = 'http://localhost:5001 http://localhost:5002 http://localhost:5003'
const csp = [
  "default-src 'self'",
  `script-src 'self' ${remoteOrigins}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${remoteOrigins}`,
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data: https://images.unsplash.com",
  `connect-src 'self' ${remoteOrigins}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')
const headers = {
  'Content-Security-Policy': csp,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

export default defineConfig({
  plugins: [react(), federation({ name: 'shell', remotes: {}, shared, dts: false })],
  build: { target: 'esnext' },
  server: { port: 5000, strictPort: true, proxy },
  preview: { port: 5000, strictPort: true, proxy, headers },
})
