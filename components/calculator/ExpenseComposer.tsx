'use client'

import { ChevronDown } from 'lucide-react'
import { CATEGORIES } from '@/lib/utils/categories'
import { Spinner } from '@/components/ui/spinner'
import type { Person } from '@/lib/types'

interface ExpenseComposerProps {
  people: Person[]
  expensesCount: number
  activeTransactionGroupId: string | null
  transactionNameInput: string
  hasPendingTransactionNameChange: boolean
  isUpdatingTransactionName: boolean
  newExpenseName: string
  newExpenseAmount: string
  newExpenseCategory: string
  categorySuggestionsOpen: boolean
  newExpensePaidBy: string
  paidByDropdownOpen: boolean
  splitDropdownOpen: boolean
  newExpenseSplitWith: string[]
  editingExpenseId: string | null
  formErrors: { name?: string; amount?: string; splitWith?: string }
  saveError: string
  isLoggedIn: boolean
  isSavingExpense: boolean
  categoryRef: React.RefObject<HTMLDivElement | null>
  paidByRef: React.RefObject<HTMLDivElement | null>
  splitRef: React.RefObject<HTMLDivElement | null>
  getCategoryIcon: (category: string) => React.ComponentType<{ className?: string }> | null | undefined
  onTransactionNameChange: (value: string) => void
  onUpdateTransactionName: () => void
  onExpenseNameChange: (value: string) => void
  onExpenseAmountChange: (value: string) => void
  onCategoryToggle: () => void
  onCategoryClear: () => void
  onCategorySelect: (value: string) => void
  onPaidByToggle: () => void
  onPaidBySelect: (id: string) => void
  onSplitToggle: () => void
  onToggleSplitWith: (id: string) => void
  onSelectAllSplitWith: () => void
  onResetTransaction: () => void
  onCancelEdit: () => void
  onSubmit: () => void
}

export function ExpenseComposer({
  people,
  expensesCount,
  activeTransactionGroupId,
  transactionNameInput,
  hasPendingTransactionNameChange,
  isUpdatingTransactionName,
  newExpenseName,
  newExpenseAmount,
  newExpenseCategory,
  categorySuggestionsOpen,
  newExpensePaidBy,
  paidByDropdownOpen,
  splitDropdownOpen,
  newExpenseSplitWith,
  editingExpenseId,
  formErrors,
  saveError,
  isLoggedIn,
  isSavingExpense,
  categoryRef,
  paidByRef,
  splitRef,
  getCategoryIcon,
  onTransactionNameChange,
  onUpdateTransactionName,
  onExpenseNameChange,
  onExpenseAmountChange,
  onCategoryToggle,
  onCategoryClear,
  onCategorySelect,
  onPaidByToggle,
  onPaidBySelect,
  onSplitToggle,
  onToggleSplitWith,
  onSelectAllSplitWith,
  onResetTransaction,
  onCancelEdit,
  onSubmit,
}: ExpenseComposerProps) {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-4xl font-bold">Add Expense</h2>
      </div>
      <div className="space-y-6">
        {(activeTransactionGroupId || people.length > 1 || expensesCount > 0) && (
          <div>
            <label className="text-sm font-bold text-muted-foreground block mb-2">Transaction Name</label>
            <input
              type="text"
              placeholder="Weekend trip"
              value={transactionNameInput}
              onChange={(event) => onTransactionNameChange(event.target.value)}
              className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground"
            />
            {hasPendingTransactionNameChange && (
              <button
                type="button"
                onClick={onUpdateTransactionName}
                disabled={isUpdatingTransactionName}
                className="mt-3 min-h-5 text-sm font-bold text-foreground/70 hover:text-foreground transition disabled:opacity-50 flex items-center"
              >
                {isUpdatingTransactionName ? <Spinner className="h-3.5 w-3.5" /> : 'Update transaction name everywhere'}
              </button>
            )}
          </div>
        )}

        <div>
          <label className="text-sm font-bold text-muted-foreground block mb-2">What</label>
          <input
            type="text"
            placeholder="Dinner"
            value={newExpenseName}
            onChange={(event) => onExpenseNameChange(event.target.value)}
            className={`w-full bg-transparent text-lg font-bold outline-none border-b-2 focus:border-foreground ${formErrors.name ? 'border-red-500' : 'border-muted-foreground/30'}`}
          />
          {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-bold text-muted-foreground block mb-2">Amount</label>
          <input
            type="number"
            placeholder="0.00"
            value={newExpenseAmount}
            onChange={(event) => onExpenseAmountChange(event.target.value)}
            step="0.01"
            className={`w-full bg-transparent text-lg font-bold outline-none border-b-2 focus:border-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${formErrors.amount ? 'border-red-500' : 'border-muted-foreground/30'}`}
          />
          {formErrors.amount && <p className="text-xs text-red-500 mt-1">{formErrors.amount}</p>}
        </div>

        <div className="relative" ref={categoryRef}>
          <label className="text-sm font-bold text-muted-foreground block mb-2">Category</label>
          <button
            type="button"
            onClick={onCategoryToggle}
            className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground text-left pb-2 flex items-center justify-between"
          >
            {newExpenseCategory ? (
              <span className="flex items-center gap-2">
                {(() => {
                  const Icon = getCategoryIcon(newExpenseCategory)
                  return Icon ? <Icon className="h-4 w-4 opacity-60" /> : null
                })()}
                {newExpenseCategory}
              </span>
            ) : (
              <span className="font-normal text-muted-foreground/50">select category</span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </button>
          {categorySuggestionsOpen && (
            <div className="absolute top-full left-0 right-0 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
              {newExpenseCategory && (
                <button
                  type="button"
                  onClick={onCategoryClear}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-muted-foreground hover:opacity-70 transition border-b border-foreground/20"
                >
                  clear
                </button>
              )}
              {CATEGORIES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onCategorySelect(value)}
                  className="w-full text-left px-4 py-3 font-bold text-base hover:opacity-70 transition border-b border-foreground/20 last:border-b-0 flex items-center gap-3"
                >
                  <Icon className="h-4 w-4 opacity-60 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-bold text-muted-foreground block mb-2">Paid By</label>
          <div className="relative" ref={paidByRef}>
            <button
              onClick={onPaidByToggle}
              className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground text-left pb-2 flex justify-between items-center"
            >
              <span>{people.find((person) => person.id === newExpensePaidBy)?.name || 'Select person'}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            {paidByDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
                {people.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => onPaidBySelect(person.id)}
                    className="w-full text-left px-4 py-3 font-bold text-base hover:opacity-70 transition border-b border-foreground/20 last:border-b-0"
                  >
                    {person.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-muted-foreground block mb-3">Split Between</label>
          <div className="relative" ref={splitRef}>
            <button
              onClick={onSplitToggle}
              className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground text-left pb-2 flex justify-between items-center"
            >
              <span>{newExpenseSplitWith.length === people.length ? 'All' : `${newExpenseSplitWith.length} selected`}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            {splitDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
                <button
                  onClick={onSelectAllSplitWith}
                  className="w-full text-left px-4 py-3 font-bold text-base hover:opacity-70 transition border-b border-foreground/20"
                >
                  Select All
                </button>
                {people.map((person) => (
                  <label key={person.id} className="flex items-center gap-3 px-4 py-3 hover:opacity-70 transition cursor-pointer border-b border-background/20 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={newExpenseSplitWith.includes(person.id)}
                      onChange={() => onToggleSplitWith(person.id)}
                      className="h-5 w-5 accent-primary"
                    />
                    <span className="font-bold text-base flex-1">{person.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {formErrors.splitWith && <p className="text-xs text-red-500">{formErrors.splitWith}</p>}
        {saveError && <p className="text-xs text-red-500">{saveError}</p>}

        <div className="flex gap-3 mt-8">
          {expensesCount > 0 && (
            <button
              type="button"
              onClick={onResetTransaction}
              className="px-5 py-4 border border-foreground/20 text-foreground font-bold text-lg rounded-lg hover:bg-foreground/5 transition"
            >
              New Transaction
            </button>
          )}
          {editingExpenseId && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-4 border border-foreground/20 text-foreground font-bold text-lg rounded-lg hover:bg-foreground/5 transition"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={isSavingExpense}
            className="w-full py-4 bg-foreground text-background font-bold text-lg rounded-lg hover:opacity-90 transition disabled:opacity-70 flex items-center justify-center"
          >
            {isSavingExpense ? <Spinner /> : editingExpenseId ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  )
}
