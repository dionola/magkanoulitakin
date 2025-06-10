import type { Expense } from '@/lib/types'

export function getExpenseShare(expense: Pick<Expense, 'amount' | 'splitWith' | 'type'>) {
  if (expense.type !== 'expense') return expense.amount

  const participantCount = expense.splitWith.length || 1
  return expense.amount / participantCount
}

export function getExpenseParticipantCount(expense: Pick<Expense, 'splitWith' | 'paidBy'>) {
  return expense.splitWith.includes(expense.paidBy)
    ? expense.splitWith.length
    : expense.splitWith.length + 1
}
