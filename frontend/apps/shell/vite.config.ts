import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
import { shared } from '../../federation.shared'
import { shellHeaders } from '../../security.ts'

// Remotes are not listed here: the shell reads them from public/manifest.json at runtime,
// so releasing or rolling back a remote never rebuilds the shell.
// One browser origin for the SPA and Laravel so Sanctum's session cookie stays first-party (ADR-04).
// Local only: Laravel via `php artisan serve --port=8100` (:8000 is taken by Apache here). When
// deployed, the same paths go through the Pages Functions in functions/ (edge/proxy.js).
const api = 'http://localhost:8100'
const proxy = { '/api': api, '/auth': api, '/sanctum': api }
const headers = shellHeaders(['http://localhost:5001', 'http://localhost:5002', 'http://localhost:5003'])

export default defineConfig({
  plugins: [react(), federation({ name: 'shell', remotes: {}, shared, dts: false })],
  build: { target: 'esnext' },
  server: { port: 5000, strictPort: true, proxy },
  preview: { port: 5000, strictPort: true, proxy, headers },
})
