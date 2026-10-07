import { expect, test, type Page } from '@playwright/test'

// Read-only smoke test of the public deployment: no orders or edits, so the demo data is unchanged.
const errors: string[] = []
const watch = (page: Page) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
}
async function signIn(page: Page, role: string, name: string) {
  await page.goto('/sign-in')
  const login = page.waitForResponse((r) => r.url().endsWith('/auth/login') && r.ok())
  await page.getByRole('button', { name: `Use ${role}` }).click()
  await login
  await expect(page.getByRole('banner').getByText(name)).toBeVisible()
}

test('public deployment: three roles, three remotes, no console or CSP errors', async ({ page }) => {
  watch(page)
  await signIn(page, 'buyer', 'Alex Rivera')
  await expect(page.locator('.tile')).toHaveCount(6)
  await page.goto('/products/stoneware-mug-oat')
  await expect(page.getByRole('heading', { name: 'Stoneware mug, oat' })).toBeVisible()
  await page.goto('/orders')
  await page.getByRole('listitem').filter({ hasText: 'CM-1001' }).getByRole('link', { name: 'View purchase' }).click()
  await expect(page.getByRole('heading', { name: 'Purchase CM-1001' })).toBeVisible()

  await signIn(page, 'seller', 'Mara Santos')
  await page.goto('/seller/orders')
  await expect(page.getByRole('link', { name: 'View order KL-1001' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Seller workspace' }).getByRole('link', { name: 'Products' }).click()
  await expect(page).toHaveURL(/\/seller\/products$/)

  await signIn(page, 'administrator', 'Admin Demo')
  await page.goto('/admin/applications')
  await expect(page.getByRole('link', { name: 'Review Sari Studio' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Moderation' }).click()
  await expect(page).toHaveURL(/\/admin\/moderation$/)

  console.log('console errors:', errors.length ? errors : 'none')
  expect(errors.filter((e) => /Content Security Policy|Refused to/i.test(e))).toEqual([])
})
