import { test, type Page } from '@playwright/test'
import { signInAs } from './helpers'

// Visual evidence for comparing the running app with the Pencil frames (docs/design/screens.md).
// Not pixel assertions: captures land in test-results/screens for review.
const shot = async (page: Page, name: string) => {
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `test-results/screens/${name}.png`, fullPage: true })
}

for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test(`capture operations screens (${label})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await signInAs(page, 'buyer')
    await page.goto('/orders')
    await shot(page, `ui07-orders-${label}`)
    await page.getByRole('listitem').filter({ hasText: 'CM-1001' }).getByRole('link', { name: 'View purchase' }).click()
    await page.getByRole('heading', { name: 'Purchase CM-1001' }).waitFor()
    await shot(page, `ui08-tracking-${label}`)

    await signInAs(page, 'seller')
    await page.goto('/seller/orders')
    await page.getByRole('link', { name: 'View order KL-1001' }).waitFor()
    await shot(page, `ui09-queue-${label}`)
    await page.getByRole('link', { name: 'View order KL-1001' }).click()
    await page.getByRole('heading', { name: 'Order KL-1001' }).waitFor()
    await shot(page, `ui10-order-${label}`)
    await page.goto('/seller/products')
    await page.getByRole('link', { name: 'Edit Stoneware mug, oat' }).waitFor()
    await shot(page, `ui11-products-${label}`)
    await page.getByRole('link', { name: 'Edit Stoneware mug, oat' }).click()
    await page.getByRole('heading', { name: 'Edit product' }).waitFor()
    await shot(page, `ui12-editor-${label}`)

    await signInAs(page, 'administrator')
    await page.goto('/admin/applications?state=all')
    await page.getByRole('link', { name: /Sari Studio/ }).waitFor()
    await shot(page, `ui13-approvals-${label}`)
    await page.getByRole('link', { name: /Sari Studio/ }).click()
    await page.getByRole('heading', { name: 'Review Sari Studio' }).waitFor()
    await shot(page, `ui14-review-${label}`)
    await page.goto('/admin/moderation')
    await page.getByRole('button', { name: 'Inspect listing' }).first().click()
    await shot(page, `ui15-moderation-${label}`)
    await page.goto('/admin/orders')
    await page.getByRole('link', { name: 'Inspect CM-1001' }).waitFor()
    await shot(page, `ui16-oversight-${label}`)
  })
}
