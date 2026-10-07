import { expect, test } from '@playwright/test'
import { signInAs, signInWith } from './helpers'

// TC-09 (UI): UI-13 → UI-14 decisions, UI-15 moderation, UI-16 read-only oversight.
test('admin approves a pending shop, which then gets the seller workspace', async ({ page }) => {
  await signInAs(page, 'administrator')
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/applications$/)
  await page.getByRole('link', { name: 'Review Sari Studio' }).click()
  await expect(page.getByRole('heading', { name: 'Review Sari Studio' })).toBeVisible()
  await expect(page.getByText('Application APP-003')).toBeVisible()

  await page.getByRole('button', { name: 'Approve seller' }).click()
  await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'History' }).getByText('Approved')).toBeVisible()

  await signInWith(page, 'lia@demo.test', 'Lia Reyes')
  await page.goto('/seller')
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible()
  await expect(page.getByText('Manage fulfilment for Sari Studio.')).toBeVisible()
})

test('rejecting needs a reason the applicant can understand', async ({ page }) => {
  await signInAs(page, 'administrator')
  await page.goto('/admin/applications')
  await page.getByRole('link', { name: 'Review Habi Home' }).click()
  await page.getByRole('button', { name: 'Reject application' }).click()
  await expect(page.getByText(/Give a reason the applicant can understand/)).toBeVisible()

  await page.getByLabel('Reason (required to reject)').fill('Product photos are missing; please add them and apply again.')
  await page.getByRole('button', { name: 'Reject application' }).click()
  await expect(page.getByText('Reason: Product photos are missing; please add them and apply again.').first()).toBeVisible()
  await page.goto('/admin/applications')
  await expect(page.getByText('No applications are waiting for review.')).toBeVisible()
})

test('moderation hides a listing from shoppers but keeps past orders, until cleared', async ({ page }) => {
  await signInAs(page, 'administrator')
  await page.goto('/admin/moderation?q=cushion')
  await page.getByRole('button', { name: 'Inspect listing' }).click()
  const panel = page.getByRole('complementary', { name: 'Selected listing' })
  await panel.getByRole('button', { name: 'Unpublish listing' }).click()
  await expect(panel.getByText(/Give a reason the seller can act on/)).toBeVisible()
  await panel.getByLabel('Moderation reason *').fill('Photo shows a different item.')
  await panel.getByRole('button', { name: 'Unpublish listing' }).click()
  await expect(panel.getByText(/Listing unpublished/)).toBeVisible()

  await page.goto('/products/linen-cushion-cover')
  await expect(page.getByRole('heading', { name: 'This product is not available' })).toBeVisible()

  // CM-1002 (Jamie) bought the cushion; oversight still shows it, read-only.
  await page.goto('/admin/orders?q=CM-1002')
  await page.getByRole('link', { name: 'Inspect CM-1002' }).click()
  await expect(page.getByText('1 × Linen cushion cover')).toBeVisible()
  await expect(page.getByRole('button')).toHaveCount(await page.getByRole('banner').getByRole('button').count())

  await signInAs(page, 'seller')
  await page.goto('/seller/products?q=cushion')
  await page.getByRole('link', { name: 'Edit Linen cushion cover' }).click()
  await expect(page.getByText('Reason: Photo shows a different item.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish listing' })).toHaveCount(0)

  await signInAs(page, 'administrator')
  await page.goto('/admin/moderation?visibility=moderated')
  await page.getByRole('button', { name: 'Inspect listing' }).click()
  await panel.getByLabel('Clearance note *').fill('Seller confirmed the correct photo.')
  await panel.getByRole('button', { name: 'Clear restriction' }).click()
  await expect(panel.getByText(/Restriction cleared/)).toBeVisible()

  // Cleared listings return to draft; the seller decides when to publish again.
  await signInAs(page, 'seller')
  await page.goto('/seller/products?q=cushion')
  await page.getByRole('link', { name: 'Edit Linen cushion cover' }).click()
  await page.getByRole('button', { name: 'Publish listing' }).click()
  await expect(page.getByText('Listing published.')).toBeVisible()
  await page.goto('/products/linen-cushion-cover')
  await expect(page.getByRole('heading', { name: 'Linen cushion cover' })).toBeVisible()
})

test('the admin side navigation moves between sections without stacking paths', async ({ page }) => {
  await signInAs(page, 'administrator')
  await page.goto('/admin/applications')
  const nav = page.getByRole('navigation', { name: 'Administration' })
  for (const [link, path, heading] of [
    ['Moderation', '/admin/moderation', 'Listing moderation'],
    ['Orders', '/admin/orders', 'Orders'],
    ['Seller approvals', '/admin/applications', 'Seller approvals'],
  ] as const) {
    await nav.getByRole('link', { name: link }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
  }
  await page.goto('/admin/no-such-page')
  await page.getByRole('link', { name: 'Back to seller approvals' }).click()
  await expect(page).toHaveURL(/\/admin\/applications$/)
})

test('order oversight keeps payment and each shop status separate', async ({ page }) => {
  await signInAs(page, 'administrator')
  await page.goto('/admin/orders?q=CM-1001')
  const row = page.getByRole('listitem').filter({ hasText: 'CM-1001' })
  await expect(row.getByText('Demo paid')).toBeVisible()
  await expect(row.getByRole('list', { name: 'CM-1001 shop orders' })).toContainText('Kubo Living')
  await row.getByRole('link', { name: 'Inspect CM-1001' }).click()
  await expect(page.getByRole('region', { name: 'Kubo Living' }).locator('.card-head .badge')).toHaveText('Processing')
  await expect(page.getByRole('region', { name: 'Daily Objects' }).locator('.card-head .badge')).toHaveText('Placed')
})
