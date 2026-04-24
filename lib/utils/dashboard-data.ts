import type { Expense, TransactionGroup } from '@/lib/types'
import { getExpenseShare } from '@/lib/utils/expense-shares'

export const DASHBOARD_CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00ff00',
  '#0088fe',
  '#ff00ff',
  '#ff0000',
  '#00ffff',
  '#ffff00',
]

export function groupExpenses(expenses: Expense[]): (Expense | TransactionGroup)[] {
  const groups = new Map<string, Expense[]>()
  const ungrouped: Expense[] = []

  expenses.forEach((expense) => {
    if (expense.transactionGroupId) {
      if (!groups.has(expense.transactionGroupId)) {
        groups.set(expense.transactionGroupId, [])
      }
      groups.get(expense.transactionGroupId)!.push(expense)
    } else {
      ungrouped.push(expense)
    }
  })

  const transactionGroups: TransactionGroup[] = Array.from(groups.entries()).map(
    ([id, groupedExpenses]) => {
      const allParticipants = new Set<string>()
      groupedExpenses.forEach((expense) => {
        allParticipants.add(expense.paidBy)
        expense.splitWith.forEach((participant) => allParticipants.add(participant))
      })

      return {
        id,
        name:
          groupedExpenses[0].transactionGroupName ||
          `${groupedExpenses.length} shared ${groupedExpenses.length === 1 ? 'purchase' : 'purchases'}`,
        expenses: groupedExpenses.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        totalAmount: groupedExpenses.reduce((sum, expense) => sum + getExpenseShare(expense), 0),
        date: groupedExpenses[0].date,
        participants: Array.from(allParticipants),
      }
    }
  )

  return [...transactionGroups, ...ungrouped].sort((a, b) => {
    const dateA = 'expenses' in a ? a.expenses[0].date : a.date
    const dateB = 'expenses' in b ? b.expenses[0].date : b.date
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })
}

export function buildCategoryData(expenses: Expense[]) {
  const spendingByCategory = expenses
    .filter((expense) => expense.type === 'expense' && expense.category)
    .reduce((acc, expense) => {
      const category = expense.category || 'uncategorized'
      acc[category] = (acc[category] || 0) + getExpenseShare(expense)
      return acc
    }, {} as Record<string, number>)

  return Object.entries(spendingByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function buildTrajectoryData(expenses: Expense[]) {
  const spendingByDate = expenses
    .filter((expense) => expense.type === 'expense')
    .reduce((acc, expense) => {
      acc[expense.date] = (acc[expense.date] || 0) + getExpenseShare(expense)
      return acc
    }, {} as Record<string, number>)

  return Object.entries(spendingByDate)
    .map(([dateStr, amount]) => ({
      date: new Date(dateStr).getTime(),
      dateStr,
      amount,
    }))
    .sort((a, b) => a.date - b.date)
    .slice(-365)
}

export function buildTrajectoryMonthTicks(trajectoryData: Array<{ date: number }>) {
  if (!trajectoryData.length) return []

  const ticks: number[] = []
  const start = new Date(trajectoryData[0].date)
  const end = new Date(trajectoryData[trajectoryData.length - 1].date)
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= end) {
    ticks.push(cursor.getTime())
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return ticks
}

export function buildMonthlyData(expenses: Expense[]) {
  const monthlySpending = expenses
    .filter((expense) => expense.type === 'expense')
    .reduce((acc, expense) => {
      const date = new Date(expense.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] || 0) + getExpenseShare(expense)
      return acc
    }, {} as Record<string, number>)

  return Object.entries(monthlySpending)
    .map(([key, amount]) => ({
      month: new Date(`${key}-02`).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      amount,
      key,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12)
}

export function calculateGroupBreakdown(group: TransactionGroup) {
  const balances: Record<string, { paid: number; owes: number; share: number }> = {}

  group.participants.forEach((participant) => {
    balances[participant] = { paid: 0, owes: 0, share: 0 }
  })

  group.expenses.forEach((expense) => {
    const perPersonShare = expense.amount / expense.splitWith.length
    balances[expense.paidBy].paid += expense.amount

    expense.splitWith.forEach((participant) => {
      balances[participant].share += perPersonShare
      if (participant !== expense.paidBy) {
        balances[participant].owes += perPersonShare
      }
    })
  })

  return balances
}
