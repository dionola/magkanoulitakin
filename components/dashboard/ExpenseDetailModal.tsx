'use client'

import type { Expense } from '@/lib/types'
import { getExpenseParticipantCount, getExpenseShare } from '@/lib/utils/expense-shares'

interface ExpenseDetailModalProps {
  detailModal: Expense[] | null
  onClose: () => void
}

export function ExpenseDetailModal({ detailModal, onClose }: ExpenseDetailModalProps) {
  if (!detailModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-lg border border-foreground/20 bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">expense details</h3>
            <p className="text-sm text-foreground/50">
              {detailModal.length} {detailModal.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-foreground/50 transition-colors hover:text-foreground"
          >
            close
          </button>
        </div>

        <div className="space-y-4">
          {detailModal.map((expense) => (
            <div key={expense.id} className="border-b border-foreground/20 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-foreground">{expense.name}</p>
                  <p className="mt-1 text-sm text-foreground/50">
                    {expense.date} • {expense.paidBy}
                  </p>
                  {expense.category && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-foreground/40">
                      {expense.category}
                    </p>
                  )}
                </div>
                <p className="text-lg font-bold text-foreground">₱{getExpenseShare(expense).toFixed(2)}</p>
              </div>

              <div className="mt-3 text-sm text-foreground/60">
                <p>total amount: ₱{expense.amount.toFixed(2)}</p>
                <p>participants: {getExpenseParticipantCount(expense)}</p>
                {expense.splitWith.length > 0 && <p>split with: {expense.splitWith.join(', ')}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
