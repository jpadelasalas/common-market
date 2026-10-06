import { expect, test, type Page } from '@playwright/test'
import { signInAs } from './helpers'

// TC-10 (AC-21, AC-22): runtime federation behaviour. The shell is never rebuilt in these tests;
// only the runtime manifest changes, exactly as a deployment would change it.

/** Serve a modified copy of the deployed manifest to this page (simulates a manifest-only deploy). */
async function deployManifest(page: Page, change: (remotes: Record<string, { entry: string; version: string; contractMajor: number }>) => void) {
  const manifest = await (await page.request.get('/manifest.json')).json()
  change(manifest.remotes)
  await page.unroute('**/manifest.json')
  await page.route('**/manifest.json', (route) => route.fulfill({ json: manifest }))
}

test('a remote that is down shows recovery inside the shell, and Try again recovers', async ({ page }) => {
  await signInAs(page, 'seller')
  await page.route('http://localhost:5002/**', (route) => route.abort())
  await page.goto('/seller')

  await expect(page.getByRole('heading', { name: 'Seller workspace is temporarily unavailable' })).toBeVisible()
  // The shell stays usable: header and navigation are intact.
  await expect(page.getByRole('banner').getByRole('link', { name: 'common market' })).toBeVisible()

  await page.unroute('http://localhost:5002/**')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible()
})

test('a remote release and its rollback change only the manifest, not the shell', async ({ page }) => {
  const release = await page.request.get('http://localhost:5002/0.2.0/remoteEntry.js')
  test.skip(!release.ok(), 'Build the demo release first: RELEASE_VERSION=0.2.0 pnpm --filter @common-market/seller build')

  await signInAs(page, 'seller')
  await deployManifest(page, (r) => Object.assign(r.seller, { entry: 'http://localhost:5002/0.2.0/remoteEntry.js', version: '0.2.0' }))
  await page.goto('/seller/orders')
  await expect(page.getByText('Portfolio demo · v0.2.0')).toBeVisible()

  // Rollback: point the manifest back at the previous immutable artifact.
  await deployManifest(page, (r) => Object.assign(r.seller, { entry: 'http://localhost:5002/0.1.0/remoteEntry.js', version: '0.1.0' }))
  await page.goto('/seller/orders')
  await expect(page.getByText('Portfolio demo · v0.1.0')).toBeVisible()
})

test('an incompatible remote contract is blocked with recovery, not mounted', async ({ page }) => {
  await signInAs(page, 'administrator')
  await deployManifest(page, (r) => {
    r.admin.contractMajor = 2
  })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Administration is temporarily unavailable' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to shopping' })).toBeVisible()
})
