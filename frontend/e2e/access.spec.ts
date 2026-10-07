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

// CMP-01 mobile header (i9d1r1): account and cart icons; the account menu overlays the page.
test('on phones the buyer account menu overlays the page and returns focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAs(page, 'buyer')
  await page.goto('/')
  const account = page.getByRole('button', { name: 'Account: Alex Rivera' })
  const yourOrders = page.getByRole('link', { name: 'Your orders' })

  await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible()
  await expect(yourOrders).toBeHidden()
  await account.click()
  await expect(yourOrders).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(yourOrders).toBeHidden()
  await expect(account).toBeFocused()

  await account.click()
  await yourOrders.click()
  await expect(page).toHaveURL(/\/orders$/)
  await expect(yourOrders).toBeHidden() // closes after navigating
})

// CMP-01 mobile workspace drawer (SqIEc): modal dialog with focus trap, Escape and focus return.
test('on phones the seller workspace menu opens a drawer that navigates and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAs(page, 'seller')
  await page.goto('/seller/orders')
  const open = page.getByRole('button', { name: 'Open workspace menu' })
  const drawer = page.getByRole('dialog', { name: 'Kubo Living' })

  await open.click()
  await expect(drawer).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(open).toBeFocused()

  await open.click()
  await drawer.getByRole('link', { name: 'Products' }).click()
  await expect(page).toHaveURL(/\/seller\/products$/)
  await expect(drawer).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible()
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
