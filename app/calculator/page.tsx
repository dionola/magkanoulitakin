'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutDashboard } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { calculateSettlements, getExpenseTotals } from '@/lib/utils/settlements'
import { getExpense, getExpenses, getFriends, getShareableTransaction } from '@/lib/api'
import type { Person, CalculatorExpense } from '@/lib/types'
import { SiteHeader } from '@/components/layout/site-header'
import { getCategoryIcon } from '@/lib/utils/categories'
import { PeoplePanel } from '@/components/calculator/PeoplePanel'
import { ExpenseComposer } from '@/components/calculator/ExpenseComposer'
import { ExpenseBreakdown } from '@/components/calculator/ExpenseBreakdown'
import { CurrencySelector } from '@/components/calculator/CurrencySelector'
import { ReceiptScanner } from '@/components/calculator/ReceiptScanner'
import { useCalculatorActions } from '@/hooks/useCalculatorActions'
import {
  buildCalculatorStateFromSavedExpenses,
  initialCalculatorPerson,
} from '@/lib/utils/calculator-state'

function CalculatorTransactionSkeleton() {
  const shimmerClass = 'bg-foreground/10'

  return (
    <div className="grid gap-16 lg:grid-cols-2">
      <div>
        <div className={`h-10 w-40 rounded-full ${shimmerClass} animate-pulse mb-8`} />
        <div className="space-y-3 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`h-8 rounded-full ${shimmerClass} animate-pulse`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-12 flex-1 rounded-full ${shimmerClass} animate-pulse`} />
          <div className={`h-10 w-10 rounded-full ${shimmerClass} animate-pulse`} />
        </div>
      </div>

      <div>
        <div className={`h-10 w-48 rounded-full ${shimmerClass} animate-pulse mb-8`} />
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index}>
              <div className={`h-4 w-28 rounded-full ${shimmerClass} animate-pulse mb-2`} />
              <div className={`h-10 w-full rounded-full ${shimmerClass} animate-pulse`} />
            </div>
          ))}
          <div className="flex gap-3 mt-8">
            <div className={`h-14 w-40 rounded-lg ${shimmerClass} animate-pulse`} />
            <div className={`h-14 flex-1 rounded-lg ${shimmerClass} animate-pulse`} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CalculatorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [people, setPeople] = useState<Person[]>([initialCalculatorPerson])
  const [expenses, setExpenses] = useState<CalculatorExpense[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [categorySuggestionsOpen, setCategorySuggestionsOpen] = useState(false)
  const [newExpensePaidBy, setNewExpensePaidBy] = useState(initialCalculatorPerson.id)
  const [formErrors, setFormErrors] = useState<{ name?: string; amount?: string; splitWith?: string }>({})
  const [newExpenseSplitWith, setNewExpenseSplitWith] = useState<string[]>([initialCalculatorPerson.id])
  const [paidByDropdownOpen, setPaidByDropdownOpen] = useState(false)
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const [currency, setCurrency] = useState('₱')
  const [currencyCode, setCurrencyCode] = useState('PHP')
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingExpenseMeta, setEditingExpenseMeta] = useState<Pick<CalculatorExpense, 'sharedExpenseId' | 'transactionGroupId' | 'transactionGroupName'> | null>(null)
  const [editingExpenseSnapshot, setEditingExpenseSnapshot] = useState<CalculatorExpense | null>(null)
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session
  const [saveError, setSaveError] = useState('')
  const [isSavingExpense, setIsSavingExpense] = useState(false)
  const [isLoadingSavedExpense, setIsLoadingSavedExpense] = useState(false)
  const [isUpdatingTransactionName, setIsUpdatingTransactionName] = useState(false)
  const [activeTransactionGroupId, setActiveTransactionGroupId] = useState<string | null>(null)
  const [activeTransactionGroupName, setActiveTransactionGroupName] = useState('')
  const [activeShareLinkId, setActiveShareLinkId] = useState<string | null>(null)
  const [transactionNameInput, setTransactionNameInput] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [editingPersonName, setEditingPersonName] = useState('')
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([])
  const [friendSuggestionsOpen, setFriendSuggestionsOpen] = useState(false)
  const addPersonRef = useRef<HTMLDivElement>(null)

  const currencyRef = useRef<HTMLDivElement>(null)
  const paidByRef = useRef<HTMLDivElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)
  const lastLoadedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyDropdownOpen(false)
      if (paidByRef.current && !paidByRef.current.contains(e.target as Node)) setPaidByDropdownOpen(false)
      if (splitRef.current && !splitRef.current.contains(e.target as Node)) setSplitDropdownOpen(false)
      if (addPersonRef.current && !addPersonRef.current.contains(e.target as Node)) setFriendSuggestionsOpen(false)
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategorySuggestionsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (session?.user?.name) {
      setPeople(prev => prev.map(p => p.id === initialCalculatorPerson.id ? { ...p, name: session.user!.name! } : p))
    }
  }, [session?.user?.name])

  useEffect(() => {
    if (isLoggedIn) {
      getFriends().then(data => setFriends(data.map(f => ({ id: f.id, name: f.name })))).catch(() => {})
    } else {
      setFriends([])
    }
  }, [isLoggedIn])

  useEffect(() => {
    const shareLinkId = searchParams.get('shareLinkId')
    const expenseId = searchParams.get('expenseId')
    const transactionGroupId = searchParams.get('transactionGroupId')
    const loadKey = shareLinkId
      ? `share:${shareLinkId}`
      : expenseId
        ? `expense:${expenseId}`
        : transactionGroupId
          ? `group:${transactionGroupId}`
          : null

    if (!loadKey || lastLoadedKeyRef.current === loadKey || (!shareLinkId && !isLoggedIn)) return

    const loadSavedExpense = async () => {
      try {
        setIsLoadingSavedExpense(true)
        setSaveError('')

        let savedExpenses: Array<{
          id: string
          name: string
          amount: number
          category?: string
          paidBy: string
          splitWith: string[]
          sharedExpenseId?: string
          transactionGroupId?: string
          transactionGroupName?: string
          shareLinkId?: string
        }> = []

        if (shareLinkId) {
          const sharedTransaction = await getShareableTransaction(shareLinkId)
          savedExpenses = sharedTransaction.expenses.map(expense => ({
            ...expense,
            shareLinkId,
          }))
        } else if (expenseId) {
          const expense = await getExpense(expenseId)
          savedExpenses = [expense]
        } else if (transactionGroupId) {
          const allExpenses = await getExpenses({ dateRange: 'all' })
          savedExpenses = allExpenses.filter(expense => expense.transactionGroupId === transactionGroupId)
        }

        if (savedExpenses.length === 0) {
          setSaveError('saved expense not found')
          return
        }

        const nextState = buildCalculatorStateFromSavedExpenses(
          savedExpenses,
          session?.user?.name,
          friends
        )

        setPeople(nextState.people)
        setExpenses(nextState.expenses)
        setActiveTransactionGroupId(savedExpenses[0]?.transactionGroupId || null)
        setActiveTransactionGroupName(savedExpenses[0]?.transactionGroupName || '')
        setActiveShareLinkId(savedExpenses[0]?.shareLinkId || shareLinkId || null)
        setTransactionNameInput(savedExpenses[0]?.transactionGroupName || '')
        setEditingExpenseId(null)
        setEditingExpenseMeta(null)
        setEditingExpenseSnapshot(null)
        setNewExpenseName('')
        setNewExpenseAmount('')
        setNewExpenseCategory('')
        setNewExpensePaidBy(nextState.people[0]?.id || initialCalculatorPerson.id)
        setNewExpenseSplitWith(nextState.people.map(person => person.id))
        lastLoadedKeyRef.current = loadKey
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'failed to load saved expense')
      } finally {
        setIsLoadingSavedExpense(false)
      }
    }

    void loadSavedExpense()
  }, [searchParams, isLoggedIn, session?.user?.name, friends])

  const startEditPerson = (person: Person) => {
    setEditingPersonId(person.id)
    setEditingPersonName(person.name)
  }

  const saveEditPerson = (id: string) => {
    if (!editingPersonName.trim()) return
    setPeople(people.map(p => p.id === id ? { ...p, name: editingPersonName } : p))
    setEditingPersonId(null)
  }
  const {
    addPerson,
    removePerson,
    resetCalculatorForNewTransaction,
    updateTransactionNameEverywhere,
    addExpense,
    toggleSplitWith,
    selectAllSplitWith,
    removeExpense,
    startEditExpense,
    cancelEditExpense,
    copyShareLink,
    getPersonName,
  } = useCalculatorActions({
    router,
    sessionName: session?.user?.name,
    isLoggedIn,
    people,
    expenses,
    newPersonName,
    newExpenseName,
    newExpenseAmount,
    newExpenseCategory,
    newExpensePaidBy,
    newExpenseSplitWith,
    editingExpenseId,
    editingExpenseMeta,
    editingExpenseSnapshot,
    activeTransactionGroupId,
    activeTransactionGroupName,
    activeShareLinkId,
    transactionNameInput,
    setPeople,
    setExpenses,
    setNewPersonName,
    setNewExpenseName,
    setNewExpenseAmount,
    setNewExpenseCategory,
    setNewExpensePaidBy,
    setNewExpenseSplitWith,
    setFormErrors,
    setEditingExpenseId,
    setEditingExpenseMeta,
    setEditingExpenseSnapshot,
    setSaveError,
    setIsSavingExpense,
    setIsUpdatingTransactionName,
    setActiveTransactionGroupId,
    setActiveTransactionGroupName,
    setActiveShareLinkId,
    setTransactionNameInput,
    setShareCopied,
    lastLoadedKeyRef,
  })

  const handleAddReceiptItems = (items: { name: string; amount: number }[]) => {
    const defaultPaidBy = people[0]?.id ?? initialCalculatorPerson.id
    const newExpenses: CalculatorExpense[] = items.map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      amount: item.amount,
      paidBy: defaultPaidBy,
      splitWith: people.map(p => p.id),
      splitType: 'equal',
      splitData: {},
    }))
    setExpenses(prev => [...prev, ...newExpenses])
  }

  const expenseTotals = getExpenseTotals(people, expenses)
  const settlements = calculateSettlements(people, expenses)
  const hasPendingTransactionNameChange = !!activeTransactionGroupId &&
    transactionNameInput.trim().length > 0 &&
    transactionNameInput.trim() !== activeTransactionGroupName

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader>
        <CurrencySelector
          currency={currency}
          currencyCode={currencyCode}
          isOpen={currencyDropdownOpen}
          currencyRef={currencyRef}
          onToggle={() => setCurrencyDropdownOpen((open) => !open)}
          onSelect={(code, symbol) => {
            setCurrencyCode(code)
            setCurrency(symbol)
            setCurrencyDropdownOpen(false)
          }}
        />
        {isLoggedIn && (
          <Link href="/dashboard" className="hover:opacity-70 transition" title="dashboard">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
        )}
      </SiteHeader>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        {isLoadingSavedExpense ? (
          <CalculatorTransactionSkeleton />
        ) : (
          <div className="grid gap-16 lg:grid-cols-2">
            <PeoplePanel
              people={people}
              newPersonName={newPersonName}
              editingPersonId={editingPersonId}
              editingPersonName={editingPersonName}
              friendSuggestionsOpen={friendSuggestionsOpen}
              friends={friends}
              addPersonRef={addPersonRef}
              onNewPersonNameChange={setNewPersonName}
              onEditingPersonNameChange={setEditingPersonName}
              onOpenSuggestions={() => setFriendSuggestionsOpen(true)}
              onCloseSuggestions={() => setFriendSuggestionsOpen(false)}
              onAddPerson={addPerson}
              onRemovePerson={removePerson}
              onStartEditPerson={startEditPerson}
              onSaveEditPerson={saveEditPerson}
              onSelectFriend={(friend) => {
                setPeople((prev) => [...prev, friend])
                setNewExpenseSplitWith((prev) => [...prev, friend.id])
                setNewPersonName('')
                setFriendSuggestionsOpen(false)
              }}
            />

            <div className="space-y-6">
              <ExpenseComposer
              people={people}
              expensesCount={expenses.length}
              activeTransactionGroupId={activeTransactionGroupId}
              activeShareLinkId={activeShareLinkId}
              transactionNameInput={transactionNameInput}
              hasPendingTransactionNameChange={hasPendingTransactionNameChange}
              isUpdatingTransactionName={isUpdatingTransactionName}
              newExpenseName={newExpenseName}
              newExpenseAmount={newExpenseAmount}
              newExpenseCategory={newExpenseCategory}
              categorySuggestionsOpen={categorySuggestionsOpen}
              newExpensePaidBy={newExpensePaidBy}
              paidByDropdownOpen={paidByDropdownOpen}
              splitDropdownOpen={splitDropdownOpen}
              newExpenseSplitWith={newExpenseSplitWith}
              editingExpenseId={editingExpenseId}
              formErrors={formErrors}
              saveError={saveError}
              shareCopied={shareCopied}
              isLoggedIn={isLoggedIn}
              isSavingExpense={isSavingExpense}
              categoryRef={categoryRef}
              paidByRef={paidByRef}
              splitRef={splitRef}
              getCategoryIcon={getCategoryIcon}
              onTransactionNameChange={setTransactionNameInput}
              onUpdateTransactionName={() => void updateTransactionNameEverywhere()}
              onExpenseNameChange={(value) => {
                setNewExpenseName(value)
                setFormErrors((prev) => ({ ...prev, name: undefined }))
              }}
              onExpenseAmountChange={(value) => {
                setNewExpenseAmount(value)
                setFormErrors((prev) => ({ ...prev, amount: undefined }))
              }}
              onCategoryToggle={() => setCategorySuggestionsOpen((open) => !open)}
              onCategoryClear={() => {
                setNewExpenseCategory('')
                setCategorySuggestionsOpen(false)
              }}
              onCategorySelect={(value) => {
                setNewExpenseCategory(value)
                setCategorySuggestionsOpen(false)
              }}
              onPaidByToggle={() => setPaidByDropdownOpen((open) => !open)}
              onPaidBySelect={(id) => {
                setNewExpensePaidBy(id)
                setPaidByDropdownOpen(false)
              }}
              onSplitToggle={() => setSplitDropdownOpen((open) => !open)}
              onToggleSplitWith={toggleSplitWith}
              onSelectAllSplitWith={selectAllSplitWith}
              onCopyShareLink={() => void copyShareLink()}
              onResetTransaction={resetCalculatorForNewTransaction}
              onCancelEdit={cancelEditExpense}
              onSubmit={() => void addExpense()}
            />
              <ReceiptScanner currency={currency} onAddItems={handleAddReceiptItems} />
            </div>
          </div>
        )}

        {!isLoadingSavedExpense && (
          <ExpenseBreakdown
            expenses={expenses}
            people={people}
            expenseTotals={expenseTotals}
            settlements={settlements}
            currency={currency}
            getPersonName={getPersonName}
            getCategoryIcon={getCategoryIcon}
            onEditExpense={startEditExpense}
            onRemoveExpense={(id) => void removeExpense(id)}
          />
        )}

      </div>

    </div>
  )
}

export default function Calculator() {
  return (
    <Suspense>
      <CalculatorPage />
    </Suspense>
  )
}
