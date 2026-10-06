import { writeFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { signInAs } from './helpers'

// Measurement, not a pass/fail budget: NFR targets are provisional (architecture.md). Records the
// median time from navigation start until each page's main heading is visible, over 3 loads.
// Environment matters (local machine, remote Neon database in Singapore): record it with the numbers.
const PAGES = [
  ['buyer', '/', 'Useful things, thoughtfully chosen.'],
  ['buyer', '/products?category=home', /essentials/],
  ['buyer', '/products/stoneware-mug-oat', 'Stoneware mug, oat'],
  ['buyer', '/orders', 'Your orders'],
  ['seller', '/seller/orders', 'Orders'],
  ['administrator', '/admin/orders', 'Orders'],
] as const

async function timeToHeading(page: Page, path: string, name: string | RegExp) {
  const start = Date.now()
  await page.goto(path)
  await page.getByRole('heading', { name, level: 1 }).waitFor()
  return Date.now() - start
}

test('time to main content for key pages', async ({ page }) => {
  const results: { role: string; path: string; median_ms: number; runs_ms: number[] }[] = []
  let role = ''
  for (const [who, path, heading] of PAGES) {
    if (who !== role) {
      await signInAs(page, who)
      role = who
    }
    const runs = []
    for (let i = 0; i < 3; i++) runs.push(await timeToHeading(page, path, heading))
    results.push({ role: who, path, median_ms: [...runs].sort((a, b) => a - b)[1], runs_ms: runs })
  }
  writeFileSync('test-results/perf.json', JSON.stringify({ measured_at: new Date().toISOString(), results }, null, 2))
  console.table(results.map(({ role, path, median_ms }) => ({ role, path, median_ms })))
})
