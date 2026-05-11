'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { getExpenses } from '@/lib/api'
import { groupExpenses } from '@/lib/utils/dashboard-data'
import type { TransactionGroup, Expense } from '@/lib/types'

interface RecentTransactionsProps {
  isLoggedIn: boolean
}

export function RecentTransactions({ isLoggedIn }: RecentTransactionsProps) {
  const router = useRouter()
  const [items, setItems] = useState<(TransactionGroup | Expense)[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    getExpenses({ dateRange: 'all' })
      .then((expenses) => {
        const grouped = groupExpenses(expenses)
        setItems(grouped.slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  if (!isLoggedIn || (items.length === 0 && !loading)) return null

  const handleClick = (item: TransactionGroup | Expense) => {
    if ('expenses' in item) {
      router.push(`/calculator?transactionGroupId=${item.id}`)
    } else {
      router.push(`/calculator?expenseId=${item.id}`)
    }
  }

  const formatAmount = (item: TransactionGroup | Expense) => {
    const amount = 'expenses' in item ? item.totalAmount : item.amount
    return amount.toFixed(2)
  }

  const getName = (item: TransactionGroup | Expense) => {
    return 'expenses' in item ? item.name : item.name
  }

  const getMeta = (item: TransactionGroup | Expense) => {
    if ('expenses' in item) {
      return `${item.expenses.length} expense${item.expenses.length !== 1 ? 's' : ''} · ${item.participants.length} people`
    }
    return new Date(item.date).toLocaleDateString()
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Recent
      </h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded-full bg-foreground/10 animate-pulse" />
                <div className="h-3 w-20 rounded-full bg-foreground/10 animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded-full bg-foreground/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className="w-full flex items-center justify-between border-b border-foreground/10 pb-3 pt-2 hover:opacity-70 transition text-left"
            >
              <div>
                <p className="font-bold text-sm">{getName(item)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getMeta(item)}</p>
              </div>
              <p className="font-bold text-sm tabular-nums">{formatAmount(item)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
