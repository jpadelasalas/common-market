import { defineConfig } from '@playwright/test'

// Runs against the real stack: shell + remotes (vite preview :5000-5003) and Laravel (:8100).
// Build first (`pnpm build`). Uses the installed Microsoft Edge, so no browser download is needed.
export default defineConfig({
  testDir: './e2e',
  // One shared demo database, reset once in global setup: run serially.
  workers: 1,
  fullyParallel: false,
  globalSetup: './e2e/reset-db.ts',
  reporter: [['list']],
  // Generous: the database is remote (Neon, ~120 ms per query) and antivirus scanning slows cold loads.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: 'http://localhost:5000',
    channel: 'msedge',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'php ../backend/apps/api/artisan serve --port=8100', url: 'http://localhost:8100/up', reuseExistingServer: true },
    { command: 'pnpm preview', url: 'http://localhost:5000', reuseExistingServer: true },
  ],
})
