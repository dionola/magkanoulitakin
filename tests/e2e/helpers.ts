import { execFileSync } from 'node:child_process'
import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Test123!'

export function resetDatabase() {
  execFileSync('pnpm', ['seed'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  })
}

export async function signUp(page: Page, opts: { name: string; email: string; password?: string }) {
  await page.goto('/auth/signup')
  await page.getByPlaceholder('john doe').fill(opts.name)
  await page.getByPlaceholder('you@example.com').fill(opts.email)
  await page.getByPlaceholder(/^password$/i).fill(opts.password ?? PASSWORD)
  await page.getByPlaceholder(/^confirm password$/i).fill(opts.password ?? PASSWORD)
  await page.getByRole('button', { name: 'sign up', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'dashboard' })).toBeVisible()
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/auth/signin')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder(/^password$/i).fill(password)
  await page.getByRole('button', { name: 'sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'dashboard' })).toBeVisible()
}

export async function openCalculator(page: Page) {
  await page.goto('/calculator')
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible()
}

export async function addFriend(page: Page, email: string) {
  await page.getByTitle('add friend').click()
  await page.getByPlaceholder('friend@example.com').fill(email)
  await page.getByRole('button', { name: 'add', exact: true }).click()
}

export async function addPersonToCalculator(page: Page, name: string) {
  const input = page.getByPlaceholder('Add person')
  await input.fill(name)
  await page.getByRole('button', { name }).click()
}

export async function createCalculatorExpense(page: Page, opts: {
  name: string
  amount: string
  category?: string
  paidBy?: string
  splitNames?: string[]
}) {
  await page.getByPlaceholder('Dinner').fill(opts.name)
  await page.getByPlaceholder('0.00').fill(opts.amount)

  if (opts.category) {
    await page.getByRole('button', { name: /select category|clear|food|utilities|entertainment|transport|health|travel/i }).first().click()
    await page.getByRole('button', { name: new RegExp(opts.category, 'i') }).click()
  }

  if (opts.paidBy) {
    const paidBySection = page.locator('label').filter({ hasText: 'Paid By' }).locator('..')
    await paidBySection.getByRole('button').click()
    await page.getByRole('button', { name: opts.paidBy }).click()
  }

  if (opts.splitNames) {
    const splitSection = page.locator('label').filter({ hasText: 'Split Between' }).locator('..')
    await splitSection.getByRole('button').click()
    for (const name of opts.splitNames) {
      const checkboxLabel = page.locator('label').filter({ hasText: name })
      const checkbox = checkboxLabel.locator('input[type="checkbox"]')
      if (!(await checkbox.isChecked())) {
        await checkboxLabel.click()
      }
    }
    await page.keyboard.press('Escape')
  }

  await page.getByRole('button', { name: /Add Expense|Update Expense|Saving/i }).click()
}

export async function getExpensesViaApi(page: Page) {
  const response = await page.context().request.get('http://127.0.0.1:3000/api/expenses?dateRange=all')
  expect(response.ok()).toBeTruthy()
  return response.json()
}

export async function getFriendRequestsViaApi(page: Page) {
  const response = await page.context().request.get('http://127.0.0.1:3000/api/friends/requests')
  expect(response.ok()).toBeTruthy()
  return response.json()
}

export async function acceptFriendRequestViaApi(page: Page, requestId: string) {
  const response = await page.context().request.post('http://127.0.0.1:3000/api/friends/requests', {
    data: { requestId },
  })
  expect(response.ok()).toBeTruthy()
  return response.json()
}
