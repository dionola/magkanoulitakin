import { expect, test } from '@playwright/test'
import { PASSWORD, addFriend, addPersonToCalculator, createCalculatorExpense, getExpensesViaApi, openCalculator, resetDatabase, signIn, signUp } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeEach(() => {
  resetDatabase()
})

test('supports sign up and sign in with credentials', async ({ browser }) => {
  const uniqueEmail = `e2e-${Date.now()}@test.com`

  const signupPage = await browser.newPage()
  await signUp(signupPage, {
    name: 'E2E Signup User',
    email: uniqueEmail,
  })
  await expect(signupPage.getByText(uniqueEmail)).toBeVisible()
  await signupPage.close()

  const signinPage = await browser.newPage()
  await signIn(signinPage, uniqueEmail, PASSWORD)
  await expect(signinPage.getByText(uniqueEmail)).toBeVisible()
  await signinPage.close()
})

test('supports adding a friend request, accepting it, and removing the friend', async ({ browser }) => {
  const friendEmail = `friend-${Date.now()}@test.com`

  const newUserPage = await browser.newPage()
  await signUp(newUserPage, {
    name: 'Pending Friend',
    email: friendEmail,
  })
  await newUserPage.close()

  const alexPage = await browser.newPage()
  await signIn(alexPage, 'test@test.com')
  await addFriend(alexPage, friendEmail)
  await expect(alexPage.getByText(/friend request already exists/i)).toHaveCount(0)
  await alexPage.close()

  const friendPage = await browser.newPage()
  await signIn(friendPage, friendEmail)
  await expect(friendPage.getByText('test@test.com')).toBeVisible()
  await friendPage.getByRole('button', { name: 'accept' }).click()
  await expect(friendPage.getByRole('button', { name: 'accept' })).toHaveCount(0)
  await friendPage.close()

  const alexVerifyPage = await browser.newPage()
  await signIn(alexVerifyPage, 'test@test.com')
  await expect(alexVerifyPage.getByText(friendEmail)).toBeVisible()
  await alexVerifyPage.getByRole('button', { name: 'unfriend' }).last().click()
  await expect(alexVerifyPage.getByText(friendEmail)).toHaveCount(0)
  await alexVerifyPage.close()
})

test('covers shared expense creation, friend visibility, editing, adding participants, and synced updates', async ({ browser }) => {
  const alexPage = await browser.newPage()
  await signIn(alexPage, 'test@test.com')
  await openCalculator(alexPage)

  await addPersonToCalculator(alexPage, 'Jordan')
  await addPersonToCalculator(alexPage, 'Riley')
  await alexPage.getByPlaceholder('Weekend trip').fill('Beach weekend')

  await createCalculatorExpense(alexPage, {
    name: 'Trip dinner',
    amount: '900',
    category: 'food',
  })

  await expect(alexPage.getByText('Trip dinner')).toBeVisible()
  const alexExpensesAfterCreate = await getExpensesViaApi(alexPage)
  const tripDinner = alexExpensesAfterCreate.find((expense: any) => expense.name === 'Trip dinner')
  expect(tripDinner).toBeTruthy()
  expect(tripDinner.transactionGroupId).toBeTruthy()

  const jordanPage = await browser.newPage()
  await signIn(jordanPage, 'test1@test.com')
  const jordanExpensesAfterCreate = await getExpensesViaApi(jordanPage)
  const jordanTripDinner = jordanExpensesAfterCreate.find((expense: any) => expense.name === 'Trip dinner')
  expect(jordanTripDinner?.transactionGroupId).toBe(tripDinner.transactionGroupId)

  await jordanPage.goto(`/calculator?transactionGroupId=${tripDinner.transactionGroupId}`)
  await expect(jordanPage.getByText('Trip dinner')).toBeVisible()
  await jordanPage.getByText('Trip dinner').click()
  await jordanPage.getByPlaceholder('0.00').fill('1200')
  await jordanPage.getByRole('button', { name: /select category|food/i }).first().click()
  await jordanPage.getByRole('button', { name: /travel/i }).click()
  await jordanPage.getByRole('button', { name: 'Update Expense' }).click()
  await expect(jordanPage.getByText('Trip dinner')).toBeVisible()
  await expect(jordanPage.getByText('travel')).toBeVisible()

  await addPersonToCalculator(jordanPage, 'Sam')
  await createCalculatorExpense(jordanPage, {
    name: 'Taxi home',
    amount: '300',
    category: 'transport',
  })
  await expect(jordanPage.getByText('Taxi home')).toBeVisible()
  await expect(jordanPage.getByPlaceholder('Weekend trip')).toHaveValue('Beach weekend')
  await jordanPage.getByPlaceholder('Weekend trip').fill('Beach week')
  await jordanPage.getByRole('button', { name: 'Update transaction name everywhere' }).click()
  await expect(jordanPage.getByPlaceholder('Weekend trip')).toHaveValue('Beach week')
  await expect(jordanPage.getByText('Beach week')).toHaveCount(0)
  await jordanPage.getByRole('button', { name: 'New Transaction' }).click()
  await expect(jordanPage).toHaveURL(/\/calculator$/)
  await expect(jordanPage.getByPlaceholder('Weekend trip')).toHaveCount(0)
  await addPersonToCalculator(jordanPage, 'Sam')
  await jordanPage.getByPlaceholder('Weekend trip').fill('Office lunch')
  await createCalculatorExpense(jordanPage, {
    name: 'Pizza',
    amount: '450',
    category: 'food',
  })
  await expect(jordanPage.getByText('Pizza')).toBeVisible()

  const alexVerifyPage = await browser.newPage()
  await signIn(alexVerifyPage, 'test@test.com')
  const alexSharedExpenses = await getExpensesViaApi(alexVerifyPage)
  const alexTripDinner = alexSharedExpenses.find((expense: any) => expense.name === 'Trip dinner')
  const alexTaxiHome = alexSharedExpenses.find((expense: any) => expense.name === 'Taxi home')
  const alexPizza = alexSharedExpenses.find((expense: any) => expense.name === 'Pizza')

  expect(alexTripDinner?.amount).toBe(1200)
  expect(alexTripDinner?.category).toBe('travel')
  expect(alexTripDinner?.transactionGroupId).toBe(tripDinner.transactionGroupId)
  expect(alexTripDinner?.transactionGroupName).toBe('Beach week')
  expect(alexTaxiHome?.transactionGroupId).toBe(tripDinner.transactionGroupId)
  expect(alexTaxiHome?.transactionGroupName).toBe('Beach week')
  expect(alexPizza?.transactionGroupId).toBeTruthy()
  expect(alexPizza?.transactionGroupId).not.toBe(tripDinner.transactionGroupId)
  expect(alexPizza?.transactionGroupName).toBe('Office lunch')

  const samPage = await browser.newPage()
  await signIn(samPage, 'test2@test.com')
  const samExpenses = await getExpensesViaApi(samPage)
  const samTaxiHome = samExpenses.find((expense: any) => expense.name === 'Taxi home')
  const samPizza = samExpenses.find((expense: any) => expense.name === 'Pizza')
  expect(samTaxiHome?.transactionGroupId).toBe(tripDinner.transactionGroupId)
  expect(samTaxiHome?.transactionGroupName).toBe('Beach week')
  expect(samPizza?.transactionGroupName).toBe('Office lunch')

  await alexVerifyPage.goto('/dashboard')
  await expect(alexVerifyPage.getByText(/2 shared purchases/i)).toBeVisible()

  await alexPage.close()
  await jordanPage.close()
  await alexVerifyPage.close()
  await samPage.close()
})
