'use client'

import type { Dispatch, SetStateAction } from 'react'

interface QuickAddExpenseModalProps {
  isOpen: boolean
  newExpenseName: string
  newExpenseAmount: string
  newExpenseDate: string
  newExpenseCategory: string
  categorySuggestionsOpen: boolean
  isAddingExpense: boolean
  categories: readonly string[]
  onClose: () => void
  onExpenseNameChange: Dispatch<SetStateAction<string>>
  onExpenseAmountChange: Dispatch<SetStateAction<string>>
  onExpenseDateChange: Dispatch<SetStateAction<string>>
  onCategoryToggle: () => void
  onCategoryChange: (value: string) => void
  onSubmit: () => void
}

export function QuickAddExpenseModal({
  isOpen,
  newExpenseName,
  newExpenseAmount,
  newExpenseDate,
  newExpenseCategory,
  categorySuggestionsOpen,
  isAddingExpense,
  categories,
  onClose,
  onExpenseNameChange,
  onExpenseAmountChange,
  onExpenseDateChange,
  onCategoryToggle,
  onCategoryChange,
  onSubmit,
}: QuickAddExpenseModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md border border-foreground/20 bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">quick add expense</h3>
            <p className="text-sm text-foreground/50">capture an expense without leaving the dashboard</p>
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
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/70">expense name</label>
            <input
              type="text"
              value={newExpenseName}
              onChange={(event) => onExpenseNameChange(event.target.value)}
              placeholder="Lunch, groceries, transport..."
              className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/70">amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newExpenseAmount}
              onChange={(event) => onExpenseAmountChange(event.target.value)}
              placeholder="0.00"
              className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/70">date</label>
            <input
              type="date"
              value={newExpenseDate}
              onChange={(event) => onExpenseDateChange(event.target.value)}
              className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground focus:border-foreground focus:outline-none"
            />
          </div>

          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-foreground/70">category</label>
            <button
              type="button"
              onClick={onCategoryToggle}
              className="flex w-full items-center justify-between border-b-2 border-foreground/30 pb-3 text-left text-lg text-foreground transition-colors hover:border-foreground"
            >
              <span>{newExpenseCategory || 'Select a category'}</span>
              <span className="text-sm text-foreground/40">{categorySuggestionsOpen ? 'hide' : 'show'}</span>
            </button>

            {categorySuggestionsOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2 border border-foreground/20 bg-background p-3">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onCategoryChange(category)}
                    className={`border px-3 py-2 text-left text-sm transition-colors ${
                      newExpenseCategory === category
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-foreground/20 text-foreground/70 hover:border-foreground'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isAddingExpense || !newExpenseName.trim() || !newExpenseAmount}
            className="w-full border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAddingExpense ? 'adding expense...' : 'add expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
