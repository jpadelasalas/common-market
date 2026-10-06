import { expect, type Page } from '@playwright/test'

const NAMES = { buyer: 'Alex Rivera', seller: 'Mara Santos', administrator: 'Admin Demo' }

/**
 * Sign in through UI-17 and wait until the session really belongs to the new account. Order
 * matters: checking the session while the login request is still in flight would start a fresh
 * anonymous session whose cookie overwrites the login cookie, so wait for the login response first.
 * (On phones the account name sits in the collapsed menu, so the header is not a reliable signal.)
 */
async function completeSignIn(page: Page, submit: () => Promise<void>, name: string) {
  const login = page.waitForResponse((r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST' && r.ok())
  await submit()
  await login
  await expect(page).not.toHaveURL(/\/sign-in/)
  await expectSessionFor(page, name)
}

export async function signInAs(page: Page, role: keyof typeof NAMES) {
  await page.goto('/sign-in')
  await completeSignIn(page, () => page.getByRole('button', { name: `Use ${role}` }).click(), NAMES[role])
}

/** Sign in with an email (accounts without a demo button, e.g. the pending seller). */
export async function signInWith(page: Page, email: string, name: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('demo-password')
  await completeSignIn(page, () => page.getByRole('button', { name: 'Sign in', exact: true }).click(), name)
}

/** Ask the app's own origin (with the browser's cookies) who is signed in. */
export async function expectSessionFor(page: Page, name: string) {
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(async () => {
          const res = await fetch('/auth/session', { headers: { Accept: 'application/json' } })
          return (await res.json()).data?.name ?? null
        })
      } catch {
        return null // page was navigating; try again
      }
    })
    .toBe(name)
}
