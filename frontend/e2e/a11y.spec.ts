import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { signInAs } from './helpers'

// TC-13 (AC-24/AC-25): automated WCAG 2.1 A/AA checks per screen plus keyboard behaviour.
// Automated scans catch roughly a third of issues; they do not replace a screen-reader review.
async function expectNoViolations(page: Page, screen: string) {
  await page.waitForLoadState('networkidle')
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(' ')}`)
  expect(summary, `${screen} accessibility violations`).toEqual([])
}

test('buyer screens have no automated WCAG A/AA violations', async ({ page }) => {
  await page.goto('/sign-in')
  await expectNoViolations(page, 'UI-17 sign-in')
  await signInAs(page, 'buyer')
  for (const [path, screen] of [
    ['/', 'UI-01 discovery'],
    ['/products?category=home', 'UI-02 results'],
    ['/products/stoneware-mug-oat', 'UI-03 product'],
    ['/cart', 'UI-04 cart'],
    ['/orders', 'UI-07 orders'],
  ] as const) {
    await page.goto(path)
    await expectNoViolations(page, screen)
  }
  await page.getByRole('listitem').filter({ hasText: 'CM-1001' }).getByRole('link', { name: 'View purchase' }).click()
  await expectNoViolations(page, 'UI-08 tracking')
})

test('seller screens have no automated WCAG A/AA violations', async ({ page }) => {
  await signInAs(page, 'seller')
  await page.goto('/seller/orders')
  await expectNoViolations(page, 'UI-09 queue')
  await page.getByRole('link', { name: 'View order KL-1001' }).click()
  await expectNoViolations(page, 'UI-10 order')
  await page.goto('/seller/products')
  await expectNoViolations(page, 'UI-11 products')
  await page.getByRole('link', { name: 'Edit Stoneware mug, oat' }).click()
  await expectNoViolations(page, 'UI-12 editor')
})

test('admin screens have no automated WCAG A/AA violations', async ({ page }) => {
  await signInAs(page, 'administrator')
  await page.goto('/admin/applications?state=all')
  await expectNoViolations(page, 'UI-13 approvals')
  await page.getByRole('link', { name: /Habi Home/ }).click()
  await expectNoViolations(page, 'UI-14 review')
  await page.goto('/admin/moderation')
  await page.getByRole('button', { name: 'Inspect listing' }).first().click()
  await expectNoViolations(page, 'UI-15 moderation')
  await page.goto('/admin/orders')
  await expectNoViolations(page, 'UI-16 oversight')
})

test('the cancel dialog works by keyboard: focus moves in, Escape closes and returns focus', async ({ page }) => {
  await signInAs(page, 'buyer')
  await page.goto('/orders')
  await page.getByRole('listitem').filter({ hasText: 'CM-1001' }).getByRole('link', { name: 'View purchase' }).click()
  const trigger = page.getByRole('region', { name: 'Daily Objects' }).getByRole('button', { name: 'Cancel shop order' })

  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Cancel the Daily Objects order?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':focus')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
