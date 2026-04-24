'use client'

import { Trash2 } from 'lucide-react'
import type { CalculatorExpense, Person } from '@/lib/types'

interface ExpenseTotalsEntry {
  paid: number
  owes: number
  balance: number
}

interface SettlementEntry {
  from: string
  to: string
  amount: number
}

interface ExpenseBreakdownProps {
  expenses: CalculatorExpense[]
  people: Person[]
  expenseTotals: Record<string, ExpenseTotalsEntry>
  settlements: SettlementEntry[]
  currency: string
  getPersonName: (id: string) => string
  getCategoryIcon: (category: string) => React.ComponentType<{ className?: string }> | null | undefined
  onEditExpense: (expense: CalculatorExpense) => void
  onRemoveExpense: (id: string) => void
}

export function ExpenseBreakdown({
  expenses,
  people,
  expenseTotals,
  settlements,
  currency,
  getPersonName,
  getCategoryIcon,
  onEditExpense,
  onRemoveExpense,
}: ExpenseBreakdownProps) {
  return (
    <>
      {expenses.length > 0 && (
        <div className="mt-16">
          <h2 className="text-4xl font-bold mb-8">Expenses</h2>
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="group cursor-pointer flex items-center justify-between border-b border-border/20 pb-4 hover:opacity-70 transition"
                onClick={() => onEditExpense(expense)}
              >
                <div>
                  <p className="text-xl font-bold">{expense.name}</p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                    <span>{getPersonName(expense.paidBy)} paid · {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}</span>
                    {expense.category && (() => {
                      const Icon = getCategoryIcon(expense.category)
                      return (
                        <span className="flex items-center gap-1">
                          · {Icon && <Icon className="h-3 w-3" />}{expense.category}
                        </span>
                      )
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold">{currency}{expense.amount.toFixed(2)}</p>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemoveExpense(expense.id)
                    }}
                    className="text-muted-foreground hover:text-foreground transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="mt-16">
          <h2 className="text-4xl font-bold mb-8">Summary</h2>
          <div className="space-y-4">
            {people.map((person) => {
              const personTotals = expenseTotals[person.id]
              const balance = personTotals ? personTotals.balance : 0
              return (
                <div key={person.id} className="flex items-center justify-between border-b border-border/20 pb-4">
                  <p className="font-bold text-lg">{person.name}</p>
                  <div className="flex gap-12 text-lg font-bold">
                    <span>Paid: {currency}{(personTotals?.paid ?? 0).toFixed(2)}</span>
                    <span>Owes: {currency}{(personTotals?.owes ?? 0).toFixed(2)}</span>
                    <span className={balance > 0.01 ? 'text-green-500' : balance < -0.01 ? 'text-red-500' : 'text-muted-foreground'}>
                      Balance: {currency}{balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {settlements.length > 0 && (
        <div className="mt-16">
          <h2 className="text-4xl font-bold mb-8">Settlements</h2>
          <div className="space-y-4">
            {settlements.map((settlement, index) => (
              <div key={index} className="flex items-center justify-between border-b border-border/20 pb-4">
                <p className="font-bold text-lg">
                  <span>{getPersonName(settlement.from)}</span>
                  <span className="text-muted-foreground"> pays </span>
                  <span>{getPersonName(settlement.to)}</span>
                </p>
                <p className="text-2xl font-bold">{currency}{settlement.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
