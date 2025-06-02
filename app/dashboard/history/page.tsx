'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getExpenses } from '@/lib/api'
import type { Expense } from '@/lib/types'

export default function HistoryPage() {
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'all'>('all')
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getExpenses({ dateRange })
      setExpenses(data)
    } catch {
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const totalSpent = expenses
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
            {isLoading ? (
              <p className="text-background/50 text-sm">loading...</p>
            ) : expenses.length === 0 ? (
              <p className="text-background/50 text-sm">no expenses in this period</p>
            ) : (
              expenses.map(expense => (
                <div key={expense.id} className="border-b border-background/20 pb-4">
                  <button
                    onClick={() => toggleExpense(expense.id)}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex-1">
                      <p className="text-lg font-bold text-background">{expense.name}</p>
                      <p className="text-sm text-background/50 mt-1">
                        {expense.date} • {expense.budget || 'no budget'} • {expense.paidBy}
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
                        <span className="font-medium text-background">budget:</span> {expense.budget || 'no budget'}
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
