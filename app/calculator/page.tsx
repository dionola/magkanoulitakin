'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Trash2, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { calculateSettlements, getExpenseTotals } from '@/lib/utils/settlements'
import { createExpense, deleteExpense, getExpense, getExpenses, getFriends, updateExpense } from '@/lib/api'
import type { Person, CalculatorExpense } from '@/lib/types'
import { SiteHeader } from '@/components/layout/site-header'
import { CATEGORIES, getCategoryIcon } from '@/lib/utils/categories'

const initialPerson = { id: '1', name: 'You' }

function isPersistedExpenseId(id: string | null): id is string {
  return !!id && /^[0-9a-fA-F]{24}$/.test(id)
}

function buildCalculatorStateFromSavedExpenses(
  savedExpenses: Array<{
    id: string
    name: string
    amount: number
    category?: string
    paidBy: string
    splitWith: string[]
    sharedExpenseId?: string
    transactionGroupId?: string
    transactionGroupName?: string
  }>,
  sessionName: string | null | undefined,
  friends: { id: string; name: string }[]
) {
  const friendByName = new Map(friends.map(friend => [friend.name, friend.id]))
  const peopleByName = new Map<string, Person>()
  const fallbackIds = new Map<string, string>()

  const getPersonId = (name: string) => {
    if (sessionName && name === sessionName) return initialPerson.id
    const friendId = friendByName.get(name)
    if (friendId) return friendId
    if (!fallbackIds.has(name)) {
      fallbackIds.set(name, `calc-${name.toLowerCase().replace(/\s+/g, '-')}`)
    }
    return fallbackIds.get(name)!
  }

  const registerPerson = (name: string) => {
    const id = getPersonId(name)
    if (!peopleByName.has(name)) {
      peopleByName.set(name, { id, name })
    }
    return id
  }

  const expenses: CalculatorExpense[] = savedExpenses.map(expense => {
    const paidById = registerPerson(expense.paidBy)
    const splitWithIds = expense.splitWith.map(registerPerson)
    const perPerson = expense.amount / splitWithIds.length

    return {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      paidBy: paidById,
      splitWith: splitWithIds,
      splitType: 'equal',
      splitData: Object.fromEntries(splitWithIds.map(personId => [personId, perPerson])),
      sharedExpenseId: expense.sharedExpenseId,
      transactionGroupId: expense.transactionGroupId,
      transactionGroupName: expense.transactionGroupName,
    }
  })

  const currentUser = sessionName ? { id: initialPerson.id, name: sessionName } : initialPerson
  const people = Array.from(peopleByName.values())
  if (!people.find(person => person.id === currentUser.id)) {
    people.unshift(currentUser)
  }

  return { people, expenses }
}

function CalculatorPage() {
  const searchParams = useSearchParams()
  const [people, setPeople] = useState<Person[]>([initialPerson])
  const [expenses, setExpenses] = useState<CalculatorExpense[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [categorySuggestionsOpen, setCategorySuggestionsOpen] = useState(false)
  const [newExpensePaidBy, setNewExpensePaidBy] = useState(initialPerson.id)
  const [formErrors, setFormErrors] = useState<{ name?: string; amount?: string; splitWith?: string }>({})
  const [newExpenseSplitWith, setNewExpenseSplitWith] = useState<string[]>([initialPerson.id])
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
  const [activeTransactionGroupId, setActiveTransactionGroupId] = useState<string | null>(null)
  const [activeTransactionGroupName, setActiveTransactionGroupName] = useState('')
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
      setPeople(prev => prev.map(p => p.id === initialPerson.id ? { ...p, name: session.user!.name! } : p))
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
    const expenseId = searchParams.get('expenseId')
    const transactionGroupId = searchParams.get('transactionGroupId')
    const loadKey = expenseId ? `expense:${expenseId}` : transactionGroupId ? `group:${transactionGroupId}` : null

    if (!loadKey || lastLoadedKeyRef.current === loadKey || !isLoggedIn) return

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
        }> = []

        if (expenseId) {
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
        setEditingExpenseId(null)
        setEditingExpenseMeta(null)
        setEditingExpenseSnapshot(null)
        setNewExpenseName('')
        setNewExpenseAmount('')
        setNewExpenseCategory('')
        setNewExpensePaidBy(nextState.people[0]?.id || initialPerson.id)
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

  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson = { id: Date.now().toString(), name: newPersonName }
      setPeople([...people, newPerson])
      setNewExpenseSplitWith([...newExpenseSplitWith, newPerson.id])
      setNewPersonName('')
    }
  }

  const removePerson = (id: string) => {
    const remainingPeople = people.filter(p => p.id !== id)
    const fallbackPaidBy = remainingPeople[0]?.id || initialPerson.id

    setPeople(remainingPeople)
    setNewExpenseSplitWith(prev => {
      const nextSplitWith = prev.filter(personId => personId !== id)
      return nextSplitWith.length > 0 ? nextSplitWith : [fallbackPaidBy]
    })
    setNewExpensePaidBy(prev => (prev === id ? fallbackPaidBy : prev))
    setFormErrors(prev => ({
      ...prev,
      splitWith: undefined,
    }))
    setExpenses(prev =>
      prev
        .map(expense => {
          const nextSplitWith = expense.splitWith.filter(personId => personId !== id)
          if (nextSplitWith.length === 0) return null
          const paidBy = expense.paidBy === id ? nextSplitWith[0] : expense.paidBy
          const perPerson = expense.amount / nextSplitWith.length
          return {
            ...expense,
            paidBy,
            splitWith: nextSplitWith,
            splitData: Object.fromEntries(nextSplitWith.map(personId => [personId, perPerson])),
          }
        })
        .filter((expense): expense is CalculatorExpense => expense !== null)
    )
  }

  const startEditPerson = (person: Person) => {
    setEditingPersonId(person.id)
    setEditingPersonName(person.name)
  }

  const saveEditPerson = (id: string) => {
    if (!editingPersonName.trim()) return
    setPeople(people.map(p => p.id === id ? { ...p, name: editingPersonName } : p))
    setEditingPersonId(null)
  }

  const addExpense = async () => {
    const errors: typeof formErrors = {}
    if (!newExpenseName.trim()) errors.name = 'name is required'
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) errors.amount = 'enter a valid amount'
    if (newExpenseSplitWith.length === 0) errors.splitWith = 'select at least one person'
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
    setFormErrors({})
    setSaveError('')

    const amount = parseFloat(newExpenseAmount)
    const splitData: Record<string, number> = {}
    const splitCount = newExpenseSplitWith.length
    const perPerson = amount / splitCount

    newExpenseSplitWith.forEach(personId => {
      splitData[personId] = perPerson
    })

    const localExpense: CalculatorExpense = {
      id: editingExpenseId || Date.now().toString(),
      name: newExpenseName.trim(),
      amount,
      category: newExpenseCategory || undefined,
      paidBy: newExpensePaidBy,
      splitWith: newExpenseSplitWith,
      splitType: 'equal',
      splitData,
      sharedExpenseId: editingExpenseMeta?.sharedExpenseId,
      transactionGroupId: editingExpenseMeta?.transactionGroupId || activeTransactionGroupId || undefined,
      transactionGroupName: editingExpenseMeta?.transactionGroupName || activeTransactionGroupName || undefined,
    }

    let savedExpenseId = localExpense.id

    if (isLoggedIn) {
      const paidByName = getPersonName(newExpensePaidBy)
      const splitWithNames = newExpenseSplitWith.map(getPersonName)
      const sharedParticipantIds = people
        .map(person => person.id)
        .filter(personId => isPersistedExpenseId(personId) && personId !== initialPerson.id)

      setIsSavingExpense(true)
      try {
        if (isPersistedExpenseId(editingExpenseId)) {
          await updateExpense(editingExpenseId, {
            name: localExpense.name,
            amount: localExpense.amount,
            date: new Date().toISOString().split('T')[0],
            paidBy: paidByName,
            splitWith: splitWithNames,
            category: localExpense.category,
            transactionGroupName: localExpense.transactionGroupName,
            cascadeGroup: true,
          })
          savedExpenseId = editingExpenseId
        } else {
          const savedExpense = await createExpense({
            name: localExpense.name,
            amount: localExpense.amount,
            date: new Date().toISOString().split('T')[0],
            paidBy: paidByName,
            splitWith: splitWithNames,
            category: localExpense.category,
            sharedExpenseId: localExpense.sharedExpenseId,
            transactionGroupId: activeTransactionGroupId || undefined,
            transactionGroupName: activeTransactionGroupName || undefined,
            sharedParticipantIds,
          })
          savedExpenseId = savedExpense.id
          localExpense.sharedExpenseId = savedExpense.sharedExpenseId
          localExpense.transactionGroupId = savedExpense.transactionGroupId
          localExpense.transactionGroupName = savedExpense.transactionGroupName
          setActiveTransactionGroupId(savedExpense.transactionGroupId || activeTransactionGroupId)
          setActiveTransactionGroupName(savedExpense.transactionGroupName || activeTransactionGroupName)
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'failed to save expense')
        setIsSavingExpense(false)
        return
      } finally {
        setIsSavingExpense(false)
      }
    }

    setExpenses([
      ...expenses,
      {
        ...localExpense,
        id: savedExpenseId,
      },
    ])
    setEditingExpenseId(null)
    setEditingExpenseMeta(null)
    setEditingExpenseSnapshot(null)
    setNewExpenseName('')
    setNewExpenseAmount('')
    setNewExpenseCategory('')
    setNewExpenseSplitWith(people.map(p => p.id))
  }

  const toggleSplitWith = (personId: string) => {
    setNewExpenseSplitWith(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  const selectAllSplitWith = () => {
    setNewExpenseSplitWith(people.map(p => p.id))
  }

  const removeExpense = async (id: string) => {
    setSaveError('')
    if (isLoggedIn && isPersistedExpenseId(id)) {
      try {
        await deleteExpense(id, { cascadeGroup: true })
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'failed to delete expense')
        return
      }
    }
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const startEditExpense = (expense: CalculatorExpense) => {
    setEditingExpenseId(expense.id)
    setEditingExpenseMeta({
      sharedExpenseId: expense.sharedExpenseId,
      transactionGroupId: expense.transactionGroupId,
      transactionGroupName: expense.transactionGroupName,
    })
    setEditingExpenseSnapshot(expense)
    setNewExpenseName(expense.name)
    setNewExpenseAmount(expense.amount.toString())
    setNewExpenseCategory(expense.category || '')
    setNewExpensePaidBy(expense.paidBy)
    setNewExpenseSplitWith(expense.splitWith)
    setExpenses(prev => prev.filter(e => e.id !== expense.id))
    setFormErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditExpense = () => {
    if (editingExpenseSnapshot) {
      setExpenses(prev => [...prev, editingExpenseSnapshot])
    }
    setEditingExpenseId(null)
    setEditingExpenseMeta(null)
    setEditingExpenseSnapshot(null)
    setNewExpenseName('')
    setNewExpenseAmount('')
    setNewExpenseCategory('')
    setNewExpensePaidBy(people[0]?.id || initialPerson.id)
    setNewExpenseSplitWith(people.map(p => p.id))
    setFormErrors({})
    setSaveError('')
  }

  const expenseTotals = getExpenseTotals(people, expenses)
  const settlements = calculateSettlements(people, expenses)

  const getPersonName = (id: string) => {
    return people.find(p => p.id === id)?.name || 'Unknown'
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader>
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
            className="flex items-center gap-1 font-bold text-base hover:opacity-70 transition"
          >
            {currency} {currencyCode} <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
          {currencyDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-50 min-w-[120px]">
              {[['PHP', '₱'], ['USD', '$'], ['EUR', '€'], ['GBP', '£'], ['JPY', '¥'], ['INR', '₹']].map(([code, sym]) => (
                <button
                  key={code}
                  onClick={() => { setCurrencyCode(code); setCurrency(sym); setCurrencyDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 font-bold text-base hover:opacity-70 transition border-b border-foreground/20 last:border-b-0"
                >
                  {sym} {code}
                </button>
              ))}
            </div>
          )}
        </div>
        {isLoggedIn && (
          <Link href="/dashboard" className="hover:opacity-70 transition" title="dashboard">
            <LayoutDashboard className="h-5 w-5" />
          </Link>
        )}
      </SiteHeader>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        {isLoadingSavedExpense && (
          <p className="mb-6 text-sm font-medium text-muted-foreground">loading saved expense...</p>
        )}
        <div className="grid gap-16 lg:grid-cols-2">
          {/* People Section */}
          <div>
            <h2 className="text-4xl font-bold mb-8">People</h2>
            <div className="space-y-3 mb-6">
              {people.map(person => (
                <div key={person.id} className="group flex items-center justify-between">
                  {editingPersonId === person.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={editingPersonName}
                        onChange={(e) => setEditingPersonName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEditPerson(person.id)}
                        className="flex-1 bg-transparent text-lg font-bold outline-none border-b-2 border-foreground/30 focus:border-foreground"
                      />
                      <button
                        onClick={() => saveEditPerson(person.id)}
                        className="font-bold text-sm opacity-70 hover:opacity-100"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditPerson(person)}
                        className="text-xl font-bold text-left cursor-pointer hover:opacity-70 transition"
                      >
                        {person.name}
                      </button>
                      {people.length > 1 && (
                        <button
                          onClick={() => removePerson(person.id)}
                          className="text-muted-foreground hover:text-foreground transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="relative" ref={addPersonRef}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add person"
                  value={newPersonName}
                  onChange={(e) => {
                    setNewPersonName(e.target.value)
                    setFriendSuggestionsOpen(true)
                  }}
                  onFocus={() => setFriendSuggestionsOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { addPerson(); setFriendSuggestionsOpen(false) }
                  }}
                  className="flex-1 bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground"
                />
                <button
                  onClick={() => { addPerson(); setFriendSuggestionsOpen(false) }}
                  className="w-10 h-10 flex items-center justify-center text-2xl font-bold opacity-50 hover:opacity-100 transition"
                >
                  +
                </button>
              </div>
              {friendSuggestionsOpen && friends.length > 0 && (() => {
                const available = friends.filter(
                  f => !people.find(p => p.id === f.id) &&
                    f.name.toLowerCase().includes(newPersonName.toLowerCase())
                )
                return available.length > 0 ? (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
                    {available.map(friend => (
                      <button
                        key={friend.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setPeople(prev => [...prev, friend])
                          setNewExpenseSplitWith(prev => [...prev, friend.id])
                          setNewPersonName('')
                          setFriendSuggestionsOpen(false)
                        }}
                        className="w-full text-left px-4 py-3 font-bold text-base hover:opacity-70 transition border-b border-foreground/20 last:border-b-0"
                      >
                        {friend.name}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Add Expense Section */}
          <div>
            <div className="mb-8">
              <h2 className="text-4xl font-bold">Add Expense</h2>
            </div>
            <div className="space-y-6">
              {(activeTransactionGroupId || people.length > 1) && (
                <div>
                  <label className="text-sm font-bold text-muted-foreground block mb-2">Transaction Name</label>
                  <input
                    type="text"
                    placeholder="Weekend trip"
                    value={activeTransactionGroupName}
                    onChange={(e) => setActiveTransactionGroupName(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-2">What</label>
                <input
                  type="text"
                  placeholder="Dinner"
                  value={newExpenseName}
                  onChange={(e) => { setNewExpenseName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })) }}
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
                  onChange={(e) => { setNewExpenseAmount(e.target.value); setFormErrors(p => ({ ...p, amount: undefined })) }}
                  step="0.01"
                  className={`w-full bg-transparent text-lg font-bold outline-none border-b-2 focus:border-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${formErrors.amount ? 'border-red-500' : 'border-muted-foreground/30'}`}
                />
                {formErrors.amount && <p className="text-xs text-red-500 mt-1">{formErrors.amount}</p>}
              </div>

              <div className="relative" ref={categoryRef}>
                <label className="text-sm font-bold text-muted-foreground block mb-2">Category</label>
                <button
                  type="button"
                  onClick={() => setCategorySuggestionsOpen(o => !o)}
                  className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground text-left pb-2 flex items-center justify-between"
                >
                  {newExpenseCategory ? (
                    <span className="flex items-center gap-2">
                      {(() => { const Icon = getCategoryIcon(newExpenseCategory); return Icon ? <Icon className="h-4 w-4 opacity-60" /> : null })()}
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
                        onClick={() => { setNewExpenseCategory(''); setCategorySuggestionsOpen(false) }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-muted-foreground hover:opacity-70 transition border-b border-foreground/20"
                      >
                        clear
                      </button>
                    )}
                    {CATEGORIES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setNewExpenseCategory(value); setCategorySuggestionsOpen(false) }}
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
                    onClick={() => setPaidByDropdownOpen(!paidByDropdownOpen)}
                    className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground text-left pb-2 flex justify-between items-center"
                  >
                    <span>{people.find(p => p.id === newExpensePaidBy)?.name || 'Select person'}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  {paidByDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
                      {people.map(person => (
                        <button
                          key={person.id}
                          onClick={() => { setNewExpensePaidBy(person.id); setPaidByDropdownOpen(false) }}
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
                    onClick={() => setSplitDropdownOpen(!splitDropdownOpen)}
                    className="w-full bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground text-left pb-2 flex justify-between items-center"
                  >
                    <span>{newExpenseSplitWith.length === people.length ? 'All' : `${newExpenseSplitWith.length} selected`}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  {splitDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => selectAllSplitWith()}
                        className="w-full text-left px-4 py-3 font-bold text-base hover:opacity-70 transition border-b border-foreground/20"
                      >
                        Select All
                      </button>
                      {people.map(person => (
                        <label key={person.id} className="flex items-center gap-3 px-4 py-3 hover:opacity-70 transition cursor-pointer border-b border-background/20 last:border-b-0">
                          <input
                            type="checkbox"
                            checked={newExpenseSplitWith.includes(person.id)}
                            onChange={() => toggleSplitWith(person.id)}
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
                {editingExpenseId && (
                  <button
                    type="button"
                    onClick={() => {
                      cancelEditExpense()
                    }}
                    className="px-5 py-4 border border-foreground/20 text-foreground font-bold text-lg rounded-lg hover:bg-foreground/5 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={addExpense}
                  disabled={isSavingExpense}
                  className="w-full py-4 bg-foreground text-background font-bold text-lg rounded-lg hover:opacity-90 transition"
                >
                  {isSavingExpense ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Scanner Modal */}
        {/* Expenses List */}
        {expenses.length > 0 && (
          <div className="mt-16">
            <h2 className="text-4xl font-bold mb-8">Expenses</h2>
            <div className="space-y-4">
              {expenses.map(expense => (
                <div
                  key={expense.id}
                  className="group cursor-pointer flex items-center justify-between border-b border-border/20 pb-4 hover:opacity-70 transition"
                  onClick={() => startEditExpense(expense)}
                >
                  <>
                    <div>
                      <p className="text-xl font-bold">{expense.name}</p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                        {expense.transactionGroupName && <span>{expense.transactionGroupName} ·</span>}
                        <span>{getPersonName(expense.paidBy)} paid · {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}</span>
                        {expense.category && (() => { const Icon = getCategoryIcon(expense.category); return <span className="flex items-center gap-1">· {Icon && <Icon className="h-3 w-3" />}{expense.category}</span> })()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-2xl font-bold">{currency}{expense.amount.toFixed(2)}</p>
                      <button
                        onClick={(e) => {
                            e.stopPropagation()
                            removeExpense(expense.id)
                          }}
                          className="text-muted-foreground hover:text-foreground transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                  </>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Table */}
        {expenses.length > 0 && (
          <div className="mt-16">
            <h2 className="text-4xl font-bold mb-8">Summary</h2>
            <div className="space-y-4">
              {people.map(person => {
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

        {/* Settlements */}
        {settlements.length > 0 && (
          <div className="mt-16">
            <h2 className="text-4xl font-bold mb-8">Settlements</h2>
            <div className="space-y-4">
              {settlements.map((settlement, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border/20 pb-4">
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
