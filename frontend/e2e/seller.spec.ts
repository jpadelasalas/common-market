import { expect, test } from '@playwright/test'
import { signInAs } from './helpers'

// TC-06 / TC-08 (seller side): UI-09 → UI-10 fulfilment, UI-11 → UI-12 catalog and stock.
test('seller fulfils an order step by step and the buyer-facing history updates', async ({ page }) => {
  await signInAs(page, 'seller')
  await page.goto('/seller')
  await expect(page).toHaveURL(/\/seller\/orders$/)
  // Counts depend on what earlier specs bought; the queue itself is what matters here.
  await page.getByRole('button', { name: /^Placed \(\d+\)$/ }).click()
  await page.getByRole('link', { name: 'View order KL-1002' }).click()
  await expect(page.getByRole('heading', { name: 'Order KL-1002' })).toBeVisible()
  await expect(page.getByText('Jamie Cruz').first()).toBeVisible()

  await page.getByRole('button', { name: 'Start processing' }).click()
  await page.getByLabel('Dispatch reference (optional)').fill('DEMO-PH-0002')
  await page.getByRole('button', { name: 'Mark shipped' }).click()
  await expect(page.getByText('Dispatch ref. DEMO-PH-0002')).toBeVisible()
  // Shipped orders can no longer be cancelled.
  await expect(page.getByRole('button', { name: 'Cancel shop order' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mark delivered (demo)' }).click()
  await expect(page.locator('.title-row .badge')).toHaveText('Delivered')
  const history = page.getByRole('region', { name: 'Order history' })
  for (const step of ['Delivered (demo)', 'Shipped', 'Processing started', 'Order placed']) await expect(history.getByText(step)).toBeVisible()
})

test('seller adds a draft, publishes it, and it appears in the storefront', async ({ page }) => {
  await signInAs(page, 'seller')
  await page.goto('/seller/products')
  await page.getByRole('link', { name: 'Add product' }).click()
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText('Enter a product name of at least 3 characters.')).toBeVisible()

  await page.getByLabel('Product name *').fill('Rattan coaster set')
  await page.getByLabel('Category *').selectOption('home')
  await page.getByLabel('Price (PHP) *').fill('260')
  await page.getByLabel('Description *').fill('Four hand-woven rattan coasters.')
  await page.getByLabel('Available stock *').fill('15')
  await page.getByRole('button', { name: 'Save draft' }).click()

  await expect(page.getByRole('heading', { name: 'Edit product' })).toBeVisible()
  await expect(page.getByText(/Draft: only you can see this listing/)).toBeVisible()
  await page.getByRole('button', { name: 'Publish listing' }).click()
  await expect(page.getByText('Listing published.')).toBeVisible()

  await page.goto('/products/rattan-coaster-set')
  await expect(page.getByRole('heading', { name: 'Rattan coaster set' })).toBeVisible()
  await expect(page.getByText('PHP 260.00').first()).toBeVisible()
})

test('a stale stock edit keeps the seller’s input and offers both versions', async ({ page, context }) => {
  await signInAs(page, 'seller')
  await page.goto('/seller/products?q=vase')
  await page.getByRole('link', { name: 'Edit Glass bud vase' }).click()
  const stock = page.getByLabel('Available stock *')
  await expect(stock).toBeVisible()
  const original = await stock.inputValue()
  const stale = await context.newPage()
  await stale.goto(page.url())
  // Both tabs must have loaded the same version before either saves.
  await expect(stale.getByLabel('Available stock *')).toHaveValue(original)

  await page.getByLabel('Available stock *').fill('20')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved.')).toBeVisible()

  await stale.getByLabel('Available stock *').fill('2')
  await stale.getByRole('button', { name: 'Save changes' }).click()
  await expect(stale.getByText('This product changed since you opened it')).toBeVisible()
  await expect(stale.getByText(/20 in stock/)).toBeVisible()
  await expect(stale.getByLabel('Available stock *')).toHaveValue('2')

  await stale.getByRole('button', { name: 'Keep my edits' }).click()
  await stale.getByRole('button', { name: 'Save changes' }).click()
  await expect(stale.getByText('Changes saved.')).toBeVisible()
})
