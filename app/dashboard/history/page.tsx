'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Expense {
  id: string
  name: string
  amount: number
  date: string
  budget: string
  paidBy: string
  splitWith: string[]
  type: 'expense' | 'settlement'
}

const mockExpenses: Expense[] = [
  { id: '1', name: 'Flight tickets', amount: 320, date: '2024-01-15', budget: 'Vacation Trip', paidBy: 'You', splitWith: ['You', 'Alice', 'Bob'], type: 'expense' },
  { id: '2', name: 'Hotel accommodation', amount: 450, date: '2024-01-16', budget: 'Vacation Trip', paidBy: 'Alice', splitWith: ['You', 'Alice', 'Bob'], type: 'expense' },
  { id: '3', name: 'Dinner', amount: 120, date: '2024-01-17', budget: 'Vacation Trip', paidBy: 'Bob', splitWith: ['You', 'Alice', 'Bob'], type: 'expense' },
  { id: '4', name: 'Car rental', amount: 310, date: '2024-01-18', budget: 'Vacation Trip', paidBy: 'Charlie', splitWith: ['You', 'Alice', 'Bob', 'Charlie'], type: 'expense' },
  { id: '5', name: 'Rent payment', amount: 3000, date: '2024-01-20', budget: 'House Rent', paidBy: 'You', splitWith: ['You', 'David', 'Eve'], type: 'expense' },
  { id: '6', name: 'Settlement', amount: 75.50, date: '2024-01-21', budget: 'Vacation Trip', paidBy: 'You', splitWith: [], type: 'settlement' },
  { id: '7', name: 'Groceries', amount: 85, date: '2024-01-22', budget: 'House Rent', paidBy: 'David', splitWith: ['You', 'David', 'Eve'], type: 'expense' },
  { id: '8', name: 'Settlement', amount: 45, date: '2024-01-23', budget: 'Vacation Trip', paidBy: 'Bob', splitWith: [], type: 'settlement' },
  { id: '9', name: 'Lunch', amount: 45, date: '2024-01-10', budget: 'Vacation Trip', paidBy: 'You', splitWith: ['You', 'Alice'], type: 'expense' },
  { id: '10', name: 'Taxi', amount: 25, date: '2024-01-12', budget: 'Vacation Trip', paidBy: 'Alice', splitWith: ['You', 'Alice', 'Bob'], type: 'expense' },
]

export default function HistoryPage() {
  const [dateRange, setDateRange] = useState('all')
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)

  const getFilteredExpenses = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return mockExpenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      
      if (dateRange === 'thisMonth') {
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      } else if (dateRange === 'lastMonth') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const year = currentMonth === 0 ? currentYear - 1 : currentYear
        return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === year
      } else if (dateRange === 'thisYear') {
        return expenseDate.getFullYear() === currentYear
      }
      return true
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const filteredExpenses = getFilteredExpenses()
  const totalSpent = filteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId)
  }

  return (
    <div className="min-h-screen bg-foreground">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">history</h1>
          <p className="text-sm text-background/50 font-medium">all transactions and expenses</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-12">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background transition-colors cursor-pointer"
            style={{
              colorScheme: 'dark',
            }}
          >
            <option value="thisMonth" className="bg-foreground text-background">this month</option>
            <option value="lastMonth" className="bg-foreground text-background">last month</option>
            <option value="thisYear" className="bg-foreground text-background">this year</option>
            <option value="all" className="bg-foreground text-background">all time</option>
          </select>
        </div>

        {/* Total Spent */}
        <div className="mb-16 border-b border-background/20 pb-8">
          <p className="text-sm text-background/50 font-medium mb-3">total spent</p>
          <p className="text-5xl md:text-6xl font-bold text-background">₱{totalSpent.toFixed(2)}</p>
        </div>

        {/* All Expenses */}
        <div>
          <h2 className="text-2xl font-bold text-background mb-8">all expenses</h2>

          <div className="space-y-4">
            {filteredExpenses.length === 0 ? (
              <p className="text-background/50 text-sm">no expenses in this period</p>
            ) : (
              filteredExpenses.map(expense => (
                <div key={expense.id} className="border-b border-background/20 pb-4">
                  <button
                    onClick={() => toggleExpense(expense.id)}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex-1">
                      <p className="text-lg font-bold text-background">{expense.name}</p>
                      <p className="text-sm text-background/50 mt-1">
                        {expense.date} • {expense.budget} • {expense.paidBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-background">₱{expense.amount.toFixed(2)}</p>
                      {expandedExpense === expense.id ? (
                        <ChevronUp className="h-5 w-5 text-background/40" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-background/40" />
                      )}
                    </div>
                  </button>

                  {expandedExpense === expense.id && (
                    <div className="mt-4 pl-4 border-l border-background/20 space-y-2">
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">type:</span> {expense.type}
                      </p>
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">budget:</span> {expense.budget}
                      </p>
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">paid by:</span> {expense.paidBy}
                      </p>
                      {expense.splitWith.length > 0 && (
                        <p className="text-sm text-background/50">
                          <span className="font-medium text-background">split with:</span> {expense.splitWith.join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">amount per person:</span> ₱{(expense.amount / (expense.splitWith.length || 1)).toFixed(2)}
                      </p>
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">date:</span> {expense.date}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
