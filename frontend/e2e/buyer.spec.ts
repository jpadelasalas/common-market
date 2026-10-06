import { expect, test } from '@playwright/test'
import { signInAs } from './helpers'

// TC-01..TC-03, TC-05 (buyer side): UI-17 → UI-01 → UI-02 → UI-03 → UI-04 → UI-05 → UI-06 → UI-08.
test('buyer finds goods, checks out across two shops and cancels one shop order', async ({ page }) => {
  await signInAs(page, 'buyer')
  await expect(page.getByRole('heading', { name: 'Useful things, thoughtfully chosen.' })).toBeVisible()
  await expect(page.locator('.tile')).toHaveCount(6)

  // Filters live in the URL and show as removable chips.
  await page.goto('/products?category=home&min=300&max=900')
  await expect(page.getByText('4 matching goods')).toBeVisible()
  await page.getByRole('button', { name: 'Remove filter Home' }).click()
  await expect(page).not.toHaveURL(/category=home/)

  for (const [slug, quantity] of [['stoneware-mug-oat', 2], ['cotton-hand-towel', 1], ['desk-tray-walnut', 1]] as const) {
    await page.goto(`/products/${slug}`)
    for (let i = 1; i < quantity; i++) await page.getByRole('button', { name: /^Increase quantity/ }).click()
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByText(`${quantity} in your cart.`)).toBeVisible()
  }

  await page.goto('/cart')
  const kubo = page.getByRole('region', { name: 'Kubo Living' })
  await expect(kubo.getByText('PHP 1,300.00')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Daily Objects' }).getByText('PHP 870.00')).toBeVisible()
  await expect(page.getByLabel('Order summary').getByText('PHP 2,170.00')).toBeVisible()

  await page.getByRole('link', { name: 'Review order' }).click()
  await page.getByRole('button', { name: 'Place demo order' }).click()
  await expect(page.getByText('Enter address line.')).toBeVisible()
  await page.getByLabel('Address line *').fill('24 Sample Lane, Demo District')
  await page.getByLabel('City *').fill('Quezon City')
  await page.getByLabel('Postcode *').fill('1100')

  await page.getByText('Failure', { exact: true }).click()
  await page.getByRole('button', { name: 'Place demo order' }).click()
  await expect(page.getByText(/Demo payment failed\. No order was placed/)).toBeVisible()

  await page.getByText('Success', { exact: true }).click()
  await page.getByRole('button', { name: 'Place demo order' }).click()
  await expect(page.getByRole('heading', { name: 'Your demo order is placed.' })).toBeVisible()
  // Seeded history holds CM-1001..CM-1003, so this purchase is CM-1004.
  await expect(page.getByText('Purchase CM-1004')).toBeVisible()

  // UI-08: cancel only Daily Objects; Kubo Living keeps delivering.
  const daily = page.getByRole('region', { name: 'Daily Objects' })
  await daily.getByRole('button', { name: 'Cancel shop order' }).click()
  const dialog = page.getByRole('dialog', { name: 'Cancel the Daily Objects order?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel shop order' }).click()
  await expect(daily.getByText('Cancelled by you')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Kubo Living' }).getByText('Cancellation is available until this shop ships.')).toBeVisible()
  await expect(page.getByText('Partially refunded')).toBeVisible()

  await page.goto('/orders')
  await expect(page.getByText('CM-1004')).toBeVisible()
  await page.getByRole('button', { name: 'Completed' }).click()
  await expect(page.getByText('No orders in this view.')).toBeVisible()
})

test('the seeded CM-1001 shows independent shop timelines', async ({ page }) => {
  await signInAs(page, 'buyer')
  await page.goto('/orders')
  await page.getByRole('listitem').filter({ hasText: 'CM-1001' }).getByRole('link', { name: 'View purchase' }).click()
  await expect(page.getByRole('heading', { name: 'Purchase CM-1001' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Kubo Living' }).getByText('Processing', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Daily Objects' }).locator('.badge')).toHaveText('Placed')
})
