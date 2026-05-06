'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { createExpense, updateMe, updatePassword, deleteAccount } from '@/lib/api'
import type { Expense } from '@/lib/types'

interface UseDashboardStateArgs {
  authenticated: boolean
  status: string
  sessionName?: string | null
  router: {
    push: (href: string) => void
    refresh: () => void
  }
  updateSession?: (data?: unknown) => Promise<unknown>
  session?: unknown
}

export function useDashboardState({
  authenticated,
  status,
  sessionName,
  router,
  updateSession,
  session,
}: UseDashboardStateArgs) {
  const queryClient = useQueryClient()
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [friendExpenses, setFriendExpenses] = useState<Expense[]>([])
  const [isLoadingFriendExpenses, setIsLoadingFriendExpenses] = useState(false)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [showChangeName, setShowChangeName] = useState(false)
  const [newName, setNewName] = useState('')
  const [isChangingName, setIsChangingName] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [detailModal, setDetailModal] = useState<Expense[] | null>(null)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [categorySuggestionsOpen, setCategorySuggestionsOpen] = useState(false)
  const [isAddingExpense, setIsAddingExpense] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (authenticated && sessionName) {
      setDisplayName(sessionName)
    }
  }, [status, authenticated, sessionName, router])

  const handleChangeName = async () => {
    if (!newName.trim()) {
      setError('Name cannot be empty')
      return
    }
    if (newName.trim() === sessionName) {
      setShowChangeName(false)
      setNewName('')
      return
    }
    try {
      setIsChangingName(true)
      setError(null)
      const updatedUser = await updateMe({ name: newName.trim() })
      setDisplayName(updatedUser.name)
      setShowChangeName(false)
      setNewName('')
      if (updateSession) {
        await updateSession({
          ...(session as object),
          user: {
            ...((session as { user?: object } | undefined)?.user ?? {}),
            name: updatedUser.name,
          },
        })
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change name')
    } finally {
      setIsChangingName(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    try {
      setIsChangingPassword(true)
      setError(null)
      await updatePassword({ currentPassword, newPassword })
      setShowChangePassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      setError('please type "delete" to confirm')
      return
    }
    setIsDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  const handleAddExpense = async () => {
    if (!newExpenseName.trim() || !newExpenseAmount) return
    setIsAddingExpense(true)
    setError(null)
    try {
      await createExpense({
        name: newExpenseName.trim(),
        amount: parseFloat(newExpenseAmount),
        date: newExpenseDate,
        paidBy: displayName || sessionName || 'me',
        splitWith: [],
        category: newExpenseCategory || undefined,
      })
      setNewExpenseName('')
      setNewExpenseAmount('')
      setNewExpenseDate(new Date().toISOString().split('T')[0])
      setNewExpenseCategory('')
      setShowAddExpense(false)
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense')
    } finally {
      setIsAddingExpense(false)
    }
  }

  return {
    dateRange,
    customStartDate,
    customEndDate,
    showCustomDateRange,
    showHistory,
    showDeleteAccount,
    deleteConfirm,
    isDeleting,
    error,
    showChangePassword,
    currentPassword,
    newPassword,
    confirmNewPassword,
    isChangingPassword,
    selectedFriendId,
    friendExpenses,
    isLoadingFriendExpenses,
    showAddFriendModal,
    friendEmail,
    showChangeName,
    newName,
    isChangingName,
    displayName,
    detailModal,
    showAddExpense,
    newExpenseName,
    newExpenseAmount,
    newExpenseDate,
    newExpenseCategory,
    categorySuggestionsOpen,
    isAddingExpense,
    setDateRange,
    setCustomStartDate,
    setCustomEndDate,
    setShowCustomDateRange,
    setShowHistory,
    setShowDeleteAccount,
    setDeleteConfirm,
    setError,
    setShowChangePassword,
    setCurrentPassword,
    setNewPassword,
    setConfirmNewPassword,
    setSelectedFriendId,
    setFriendExpenses,
    setIsLoadingFriendExpenses,
    setShowAddFriendModal,
    setFriendEmail,
    setShowChangeName,
    setNewName,
    setDetailModal,
    setShowAddExpense,
    setNewExpenseName,
    setNewExpenseAmount,
    setNewExpenseDate,
    setNewExpenseCategory,
    setCategorySuggestionsOpen,
    handleChangeName,
    handleChangePassword,
    handleDeleteAccount,
    handleAddExpense,
  }
}
