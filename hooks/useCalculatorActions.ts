'use client'

import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { createExpense, deleteExpense, updateExpense, updateTransactionGroupName } from '@/lib/api'
import type { CalculatorExpense, Person } from '@/lib/types'
import { initialCalculatorPerson, isPersistedExpenseId } from '@/lib/utils/calculator-state'

interface UseCalculatorActionsArgs {
  router: AppRouterInstance
  sessionName?: string | null
  isLoggedIn: boolean
  people: Person[]
  expenses: CalculatorExpense[]
  newPersonName: string
  newExpenseName: string
  newExpenseAmount: string
  newExpenseCategory: string
  newExpensePaidBy: string
  newExpenseSplitWith: string[]
  editingExpenseId: string | null
  editingExpenseMeta: Pick<CalculatorExpense, 'sharedExpenseId' | 'transactionGroupId' | 'transactionGroupName'> | null
  editingExpenseSnapshot: CalculatorExpense | null
  activeTransactionGroupId: string | null
  activeTransactionGroupName: string
  activeShareLinkId: string | null
  transactionNameInput: string
  setPeople: Dispatch<SetStateAction<Person[]>>
  setExpenses: Dispatch<SetStateAction<CalculatorExpense[]>>
  setNewPersonName: Dispatch<SetStateAction<string>>
  setNewExpenseName: Dispatch<SetStateAction<string>>
  setNewExpenseAmount: Dispatch<SetStateAction<string>>
  setNewExpenseCategory: Dispatch<SetStateAction<string>>
  setNewExpensePaidBy: Dispatch<SetStateAction<string>>
  setNewExpenseSplitWith: Dispatch<SetStateAction<string[]>>
  setFormErrors: Dispatch<SetStateAction<{ name?: string; amount?: string; splitWith?: string }>>
  setEditingExpenseId: Dispatch<SetStateAction<string | null>>
  setEditingExpenseMeta: Dispatch<SetStateAction<Pick<CalculatorExpense, 'sharedExpenseId' | 'transactionGroupId' | 'transactionGroupName'> | null>>
  setEditingExpenseSnapshot: Dispatch<SetStateAction<CalculatorExpense | null>>
  setSaveError: Dispatch<SetStateAction<string>>
  setIsSavingExpense: Dispatch<SetStateAction<boolean>>
  setIsUpdatingTransactionName: Dispatch<SetStateAction<boolean>>
  setActiveTransactionGroupId: Dispatch<SetStateAction<string | null>>
  setActiveTransactionGroupName: Dispatch<SetStateAction<string>>
  setActiveShareLinkId: Dispatch<SetStateAction<string | null>>
  setTransactionNameInput: Dispatch<SetStateAction<string>>
  setShareCopied: Dispatch<SetStateAction<boolean>>
  lastLoadedKeyRef: MutableRefObject<string | null>
}

export function useCalculatorActions({
  router,
  sessionName,
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
}: UseCalculatorActionsArgs) {
  const getPersonName = (id: string) => {
    return people.find((person) => person.id === id)?.name || 'Unknown'
  }

  const addPerson = () => {
    if (!newPersonName.trim()) return

    const newPerson = { id: Date.now().toString(), name: newPersonName }
    setPeople([...people, newPerson])
    setNewExpenseSplitWith([...newExpenseSplitWith, newPerson.id])
    setNewPersonName('')
  }

  const removePerson = (id: string) => {
    const remainingPeople = people.filter((person) => person.id !== id)
    const fallbackPaidBy = remainingPeople[0]?.id || initialCalculatorPerson.id

    setPeople(remainingPeople)
    setNewExpenseSplitWith((prev) => {
      const nextSplitWith = prev.filter((personId) => personId !== id)
      return nextSplitWith.length > 0 ? nextSplitWith : [fallbackPaidBy]
    })
    setNewExpensePaidBy((prev) => (prev === id ? fallbackPaidBy : prev))
    setFormErrors((prev) => ({ ...prev, splitWith: undefined }))
    setExpenses((prev) =>
      prev
        .map((expense) => {
          const nextSplitWith = expense.splitWith.filter((personId) => personId !== id)
          if (nextSplitWith.length === 0) return null
          const paidBy = expense.paidBy === id ? nextSplitWith[0] : expense.paidBy
          const perPerson = expense.amount / nextSplitWith.length
          return {
            ...expense,
            paidBy,
            splitWith: nextSplitWith,
            splitData: Object.fromEntries(nextSplitWith.map((personId) => [personId, perPerson])),
          }
        })
        .filter((expense): expense is CalculatorExpense => expense !== null)
    )
  }

  const resetCalculatorForNewTransaction = () => {
    const currentUser = sessionName
      ? { id: initialCalculatorPerson.id, name: sessionName }
      : initialCalculatorPerson

    setPeople([currentUser])
    setExpenses([])
    setNewPersonName('')
    setNewExpenseName('')
    setNewExpenseAmount('')
    setNewExpenseCategory('')
    setNewExpensePaidBy(currentUser.id)
    setNewExpenseSplitWith([currentUser.id])
    setFormErrors({})
    setEditingExpenseId(null)
    setEditingExpenseMeta(null)
    setEditingExpenseSnapshot(null)
    setSaveError('')
    setActiveTransactionGroupId(null)
    setActiveTransactionGroupName('')
    setActiveShareLinkId(null)
    setTransactionNameInput('')
    setShareCopied(false)
    lastLoadedKeyRef.current = null
    router.replace('/calculator')
  }

  const updateTransactionNameEverywhere = async () => {
    const nextName = transactionNameInput.trim()
    if (!activeTransactionGroupId || !nextName || nextName === activeTransactionGroupName) return

    setSaveError('')
    setIsUpdatingTransactionName(true)
    try {
      await updateTransactionGroupName(activeTransactionGroupId, {
        transactionGroupName: nextName,
        shareLinkId: activeShareLinkId || undefined,
      })
      setActiveTransactionGroupName(nextName)
      setExpenses((prev) =>
        prev.map((expense) => ({
          ...expense,
          transactionGroupName:
            expense.transactionGroupId === activeTransactionGroupId ? nextName : expense.transactionGroupName,
        }))
      )
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'failed to update transaction name')
    } finally {
      setIsUpdatingTransactionName(false)
    }
  }

  const addExpense = async () => {
    const errors: { name?: string; amount?: string; splitWith?: string } = {}
    if (!newExpenseName.trim()) errors.name = 'name is required'
    if (!newExpenseAmount || parseFloat(newExpenseAmount) <= 0) errors.amount = 'enter a valid amount'
    if (newExpenseSplitWith.length === 0) errors.splitWith = 'select at least one person'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setSaveError('')

    const amount = parseFloat(newExpenseAmount)
    const perPerson = amount / newExpenseSplitWith.length
    const splitData = Object.fromEntries(newExpenseSplitWith.map((personId) => [personId, perPerson]))

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
      transactionGroupName:
        editingExpenseMeta?.transactionGroupName ||
        activeTransactionGroupName ||
        transactionNameInput.trim() ||
        undefined,
    }

    let savedExpenseId = localExpense.id
    let nextShareLinkId = activeShareLinkId

    if (isLoggedIn || activeShareLinkId || !editingExpenseId) {
      const paidByName = getPersonName(newExpensePaidBy)
      const splitWithNames = newExpenseSplitWith.map(getPersonName)
      const sharedParticipantIds = people
        .map((person) => person.id)
        .filter((personId) => isPersistedExpenseId(personId) && personId !== initialCalculatorPerson.id)

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
            transactionGroupName: activeTransactionGroupName || undefined,
            cascadeGroup: true,
            shareLinkId: activeShareLinkId || undefined,
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
            transactionGroupName: transactionNameInput.trim() || undefined,
            sharedParticipantIds,
            shareLinkId: activeShareLinkId || undefined,
          })

          savedExpenseId = savedExpense.id
          nextShareLinkId = savedExpense.shareLinkId || nextShareLinkId
          localExpense.sharedExpenseId = savedExpense.sharedExpenseId
          localExpense.transactionGroupId = savedExpense.transactionGroupId
          localExpense.transactionGroupName = savedExpense.transactionGroupName
          localExpense.shareLinkId = savedExpense.shareLinkId
          setActiveTransactionGroupId(savedExpense.transactionGroupId || activeTransactionGroupId)
          setActiveTransactionGroupName(
            savedExpense.transactionGroupName || transactionNameInput.trim() || activeTransactionGroupName
          )
          setActiveShareLinkId(savedExpense.shareLinkId || activeShareLinkId)
          setTransactionNameInput(
            savedExpense.transactionGroupName || transactionNameInput.trim() || activeTransactionGroupName
          )
          if (savedExpense.shareLinkId) {
            router.replace(`/calculator?shareLinkId=${encodeURIComponent(savedExpense.shareLinkId)}`)
            lastLoadedKeyRef.current = `share:${savedExpense.shareLinkId}`
          }
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
        shareLinkId: nextShareLinkId || undefined,
      },
    ])
    setEditingExpenseId(null)
    setEditingExpenseMeta(null)
    setEditingExpenseSnapshot(null)
    setNewExpenseName('')
    setNewExpenseAmount('')
    setNewExpenseCategory('')
    setNewExpenseSplitWith(people.map((person) => person.id))
  }

  const toggleSplitWith = (personId: string) => {
    setNewExpenseSplitWith((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    )
  }

  const selectAllSplitWith = () => {
    setNewExpenseSplitWith(people.map((person) => person.id))
  }

  const removeExpense = async (id: string) => {
    setSaveError('')
    if (isPersistedExpenseId(id)) {
      try {
        await deleteExpense(id, { cascadeGroup: true, shareLinkId: activeShareLinkId || undefined })
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'failed to delete expense')
        return
      }
    }
    setExpenses(expenses.filter((expense) => expense.id !== id))
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
    setExpenses((prev) => prev.filter((entry) => entry.id !== expense.id))
    setFormErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditExpense = () => {
    if (editingExpenseSnapshot) {
      setExpenses((prev) => [...prev, editingExpenseSnapshot])
    }
    setEditingExpenseId(null)
    setEditingExpenseMeta(null)
    setEditingExpenseSnapshot(null)
    setNewExpenseName('')
    setNewExpenseAmount('')
    setNewExpenseCategory('')
    setNewExpensePaidBy(people[0]?.id || initialCalculatorPerson.id)
    setNewExpenseSplitWith(people.map((person) => person.id))
    setFormErrors({})
    setSaveError('')
  }

  const copyShareLink = async () => {
    if (!activeShareLinkId || typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${activeShareLinkId}`)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setSaveError('failed to copy share link')
    }
  }

  return {
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
  }
}
