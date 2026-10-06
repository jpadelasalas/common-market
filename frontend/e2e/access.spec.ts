import { expect, test } from '@playwright/test'
import { signInAs, signInWith } from './helpers'

// TC-07 / TC-11 (UI side). The API enforces these rules; the UI must explain, not leak.
test('guests are sent to sign-in and returned to where they were', async ({ page }) => {
  await page.goto('/cart')
  await page.getByRole('link', { name: 'Sign in' }).last().click()
  await expect(page).toHaveURL(/\/sign-in\?return=%2Fcart/)
  await page.getByRole('button', { name: 'Use buyer' }).click()
  await expect(page).toHaveURL(/\/cart$/)
})

test('on phones the main menu collapses behind a button and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAs(page, 'buyer')
  const menu = page.getByRole('button', { name: 'Menu' })
  const orders = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Orders' })

  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(orders).toBeHidden()
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(orders).toBeVisible()
  await orders.focus()
  await page.keyboard.press('Escape')
  await expect(orders).toBeHidden()
  await expect(menu).toBeFocused()

  await menu.click()
  await orders.click()
  await expect(page).toHaveURL(/\/orders$/)
  await expect(menu).toHaveAttribute('aria-expanded', 'false') // closes after navigating
})

test('buyers and pending sellers do not get the seller workspace', async ({ page }) => {
  await signInAs(page, 'buyer')
  await page.goto('/seller/orders')
  await expect(page.getByText('Sign in with an approved seller account')).toBeVisible()

  await signInWith(page, 'lia@demo.test', 'Lia Reyes')
  await page.goto('/seller')
  await expect(page.getByText("Sari Studio's application is pending.")).toBeVisible()
})

test("a seller opening another shop's order sees not found", async ({ page }) => {
  await signInAs(page, 'buyer')
  await page.goto('/orders')
  await page.getByRole('listitem').filter({ hasText: 'CM-1001' }).getByRole('link', { name: 'View purchase' }).click()
  const dailyOrderId = await page.evaluate(async (purchaseId) => {
    const res = await fetch(`/api/v1/purchases/${purchaseId}`, { headers: { Accept: 'application/json' } })
    return (await res.json()).data.seller_orders.find((o: { seller: { name: string } }) => o.seller.name === 'Daily Objects').id
  }, page.url().split('/').pop())

  await signInAs(page, 'seller')
  await page.goto(`/seller/orders/${dailyOrderId}`)
  await expect(page.getByRole('heading', { name: 'Order not found' })).toBeVisible()
  await expect(page.getByText('DO-1001')).toHaveCount(0)
})
