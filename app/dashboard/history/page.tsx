'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { getExpenses } from '@/lib/api'
import type { Expense } from '@/lib/types'
import { useTheme } from '@/components/providers/theme-provider'
import { CATEGORIES, getCategoryIcon } from '@/lib/utils/categories'
import { getExpenseShare } from '@/lib/utils/expense-shares'

function HistoryListSkeleton() {
  const shimmerClass = 'bg-background/10'

  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="border-b border-background/20 pb-4">
          <div className={`h-6 w-44 rounded-full ${shimmerClass} animate-pulse mb-2`} />
          <div className={`h-4 w-64 rounded-full ${shimmerClass} animate-pulse mb-3`} />
          <div className={`h-8 w-24 rounded-full ${shimmerClass} animate-pulse`} />
        </div>
      ))}
    </div>
  )
}

export default function HistoryPage() {
  const { darkMode } = useTheme()
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const filtered = selectedCategory
    ? expenses.filter(e => e.category === selectedCategory)
    : expenses

  const sortedFiltered = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const totalSpent = sortedFiltered
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + getExpenseShare(e), 0)

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId)
  }

  const selectStyle = "bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background transition-colors cursor-pointer"
  const SelectedCatIcon = selectedCategory ? getCategoryIcon(selectedCategory) : null

  return (
    <div className="min-h-dvh bg-foreground">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">history</h1>
          <p className="text-sm text-background/50 font-medium">all transactions and expenses</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6 mb-12">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className={selectStyle}
            style={{ colorScheme: darkMode ? 'dark' : 'light' }}
          >
            <option value="thisMonth">this month</option>
            <option value="lastMonth">last month</option>
            <option value="thisYear">this year</option>
            <option value="all">all time</option>
          </select>

          {/* Custom category dropdown */}
          <div className="relative" ref={categoryRef}>
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(o => !o)}
              className="flex items-center gap-2 text-sm text-background border-b-2 border-background/30 pb-2 hover:border-background transition-colors"
            >
              {selectedCategory ? (
                <>
                  {SelectedCatIcon && <SelectedCatIcon className="h-3.5 w-3.5" />}
                  {selectedCategory}
                </>
              ) : (
                'all categories'
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            {categoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-foreground text-background border border-background/20 shadow-lg z-10 min-w-[160px]">
                <button
                  type="button"
                  onClick={() => { setSelectedCategory(''); setCategoryDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:opacity-70 transition border-b border-background/10"
                >
                  all categories
                </button>
                {CATEGORIES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setSelectedCategory(value); setCategoryDropdownOpen(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:opacity-70 transition flex items-center gap-2 border-b border-background/10 last:border-b-0"
                  >
                    <Icon className="h-3.5 w-3.5 opacity-60 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Total Spent */}
        <div className="mb-16 border-b border-background/20 pb-8">
          <p className="text-sm text-background/50 font-medium mb-3">total spent</p>
          <p className="text-5xl md:text-6xl font-bold text-background">₱{totalSpent.toFixed(2)}</p>
        </div>

        {/* Expenses List */}
        <div>
          <h2 className="text-2xl font-bold text-background mb-8 flex items-center gap-2">
            {selectedCategory ? (
              <>
                {SelectedCatIcon && <SelectedCatIcon className="h-5 w-5 opacity-70" />}
                {selectedCategory}
              </>
            ) : 'all expenses'}
          </h2>

          <div className="space-y-4">
            {isLoading ? (
              <HistoryListSkeleton />
            ) : sortedFiltered.length === 0 ? (
              <p className="text-background/50 text-sm">no expenses in this period</p>
            ) : (
              sortedFiltered.map(expense => {
                const CatIcon = expense.category ? getCategoryIcon(expense.category) : null
                return (
                  <div key={expense.id} className="border-b border-background/20 pb-4">
                    <button
                      onClick={() => toggleExpense(expense.id)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex-1">
                        <p className="text-lg font-bold text-background">{expense.name}</p>
                        <p className="text-sm text-background/50 mt-1 flex items-center gap-1 flex-wrap">
                          {expense.transactionGroupName && <span>{expense.transactionGroupName}</span>}
                          <span>{expense.date}</span>
                          {expense.category && (
                            <span className="flex items-center gap-1">
                              •{CatIcon && <CatIcon className="h-3 w-3" />}{expense.category}
                            </span>
                          )}
                          <span>• {expense.paidBy}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xl font-bold text-background">₱{getExpenseShare(expense).toFixed(2)}</p>
                        {expandedExpense === expense.id
                          ? <ChevronUp className="h-5 w-5 text-background/40" />
                          : <ChevronDown className="h-5 w-5 text-background/40" />
                        }
                      </div>
                    </button>

                    {expandedExpense === expense.id && (
                      <div className="mt-4 pl-4 border-l border-background/20 space-y-2">
                        {expense.category && (
                          <p className="text-sm text-background/50 flex items-center gap-1">
                            <span className="font-medium text-background">category:</span>
                            {CatIcon && <CatIcon className="h-3 w-3" />}
                            {expense.category}
                          </p>
                        )}
                        <p className="text-sm text-background/50">
                          <span className="font-medium text-background">paid by:</span> {expense.paidBy}
                        </p>
                        {expense.splitWith.length > 0 && (
                          <p className="text-sm text-background/50">
                            <span className="font-medium text-background">split with:</span> {expense.splitWith.join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-background/50">
                          <span className="font-medium text-background">amount per person:</span> ₱{getExpenseShare(expense).toFixed(2)}
                        </p>
                        <div className="pt-2">
                          <Link
                            href={expense.transactionGroupId
                              ? `/calculator?transactionGroupId=${encodeURIComponent(expense.transactionGroupId)}`
                              : `/calculator?expenseId=${encodeURIComponent(expense.id)}`}
                            className="text-sm font-medium text-background/70 hover:text-background transition"
                          >
                            edit in calculator
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
