import type { CalculatorExpense, Person } from '@/lib/types'

export const initialCalculatorPerson = { id: '1', name: 'You' }

export function isPersistedExpenseId(id: string | null): id is string {
  return !!id && /^[0-9a-fA-F]{24}$/.test(id)
}

export function buildCalculatorStateFromSavedExpenses(
  savedExpenses: Array<{
    id: string
    name: string
    amount: number
    category?: string
    paidBy: string
    splitWith: string[]
    sharedExpenseId?: string
    transactionGroupId?: string
    transactionGroupName?: string
    shareLinkId?: string
  }>,
  sessionName: string | null | undefined,
  friends: { id: string; name: string }[]
) {
  const friendByName = new Map(friends.map((friend) => [friend.name, friend.id]))
  const peopleByName = new Map<string, Person>()
  const fallbackIds = new Map<string, string>()

  const getPersonId = (name: string) => {
    if (name === initialCalculatorPerson.name && !sessionName) return initialCalculatorPerson.id
    if (sessionName && name === sessionName) return initialCalculatorPerson.id

    const friendId = friendByName.get(name)
    if (friendId) return friendId

    if (!fallbackIds.has(name)) {
      fallbackIds.set(name, `calc-${name.toLowerCase().replace(/\s+/g, '-')}`)
    }

    return fallbackIds.get(name)!
  }

  const registerPerson = (name: string) => {
    const id = getPersonId(name)
    if (!peopleByName.has(name)) {
      peopleByName.set(name, { id, name })
    }
    return id
  }

  const expenses: CalculatorExpense[] = savedExpenses.map((expense) => {
    const paidById = registerPerson(expense.paidBy)
    const splitWithIds = expense.splitWith.map(registerPerson)
    const perPerson = expense.amount / splitWithIds.length

    return {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      paidBy: paidById,
      splitWith: splitWithIds,
      splitType: 'equal',
      splitData: Object.fromEntries(splitWithIds.map((personId) => [personId, perPerson])),
      sharedExpenseId: expense.sharedExpenseId,
      transactionGroupId: expense.transactionGroupId,
      transactionGroupName: expense.transactionGroupName,
      shareLinkId: expense.shareLinkId,
    }
  })

  const currentUser = sessionName
    ? { id: initialCalculatorPerson.id, name: sessionName }
    : initialCalculatorPerson

  const people = Array.from(peopleByName.values())
  if (!people.find((person) => person.id === currentUser.id)) {
    people.unshift(currentUser)
  }

  return { people, expenses }
}
