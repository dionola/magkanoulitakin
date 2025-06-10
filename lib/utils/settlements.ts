interface Person {
  id: string
  name: string
}

interface Expense {
  id: string
  name: string
  amount: number
  paidBy: string
  splitWith: string[]
  splitType: 'equal' | 'percentage' | 'exact'
  splitData: Record<string, number>
  date?: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface Balance {
  personId: string
  paid: number
  owes: number
  balance: number
}

/**
 * Calculate balances for each person based on expenses
 */
export function calculateBalances(
  people: Person[],
  expenses: Expense[]
): Record<string, number> {
  const balances: Record<string, number> = {}
  
  // Initialize balances
  people.forEach(p => {
    balances[p.id] = 0
  })

  // Calculate balances from expenses
  expenses.forEach(expense => {
    const perPersonShare = expense.amount / expense.splitWith.length
    expense.splitWith.forEach(personId => {
      if (personId !== expense.paidBy) {
        balances[personId] -= perPersonShare
      }
    })
    balances[expense.paidBy] += expense.amount - (expense.splitWith.includes(expense.paidBy) ? perPersonShare : 0)
  })

  return balances
}

/**
 * Calculate settlements using a greedy algorithm that minimizes transactions
 * and ensures no person pays themselves
 */
export function calculateSettlements(
  people: Person[],
  expenses: Expense[]
): Settlement[] {
  const balances = calculateBalances(people, expenses)
  const settlements: Settlement[] = []
  
  // Create arrays of debtors (negative balance) and creditors (positive balance)
  const debtors = Object.entries(balances)
    .filter(([_, balance]) => balance < -0.01)
    .map(([id, balance]) => ({ id, balance: Math.abs(balance) }))
    .sort((a, b) => b.balance - a.balance) // Sort by largest debt first
  
  const creditors = Object.entries(balances)
    .filter(([_, balance]) => balance > 0.01)
    .map(([id, balance]) => ({ id, balance }))
    .sort((a, b) => b.balance - a.balance) // Sort by largest credit first

  // Greedy algorithm: match largest debtor with largest creditor
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]

    // Skip if same person (shouldn't happen, but safety check)
    if (debtor.id === creditor.id) {
      creditorIndex++
      continue
    }

    const settleAmount = Math.min(debtor.balance, creditor.balance)
    
    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: settleAmount,
      })

      debtor.balance -= settleAmount
      creditor.balance -= settleAmount

      // Move to next debtor if fully settled
      if (debtor.balance < 0.01) {
        debtorIndex++
      }

      // Move to next creditor if fully settled
      if (creditor.balance < 0.01) {
        creditorIndex++
      }
    } else {
      break
    }
  }

  return settlements
}

/**
 * Calculate expense totals for each person
 * "paid" is the gross amount paid (full expense amount)
 * "owes" is the total amount owed across all expenses
 */
export function getExpenseTotals(
  people: Person[],
  expenses: Expense[]
): Record<string, Balance> {
  const totals: Record<string, Balance> = {}
  
  people.forEach(person => {
    totals[person.id] = {
      personId: person.id,
      paid: 0,
      owes: 0,
      balance: 0,
    }
  })

  expenses.forEach(expense => {
    const perPersonShare = expense.amount / expense.splitWith.length
    
    // Add gross amount to paid (full expense amount)
    totals[expense.paidBy].paid += expense.amount
    
    // Add to owes amount for each person in split
    expense.splitWith.forEach(personId => {
      totals[personId].owes += perPersonShare
    })
  })

  // Calculate balance
  people.forEach(person => {
    totals[person.id].balance = totals[person.id].paid - totals[person.id].owes
  })

  return totals
}

