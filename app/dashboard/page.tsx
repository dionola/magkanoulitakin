'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Plus, Trash2, Calendar, X } from 'lucide-react'

interface Expense {
  id: string
  name: string
  amount: number
  date: string
  budget?: string
  paidBy: string
  splitWith: string[]
  type: 'expense' | 'settlement'
  transactionGroupId?: string
}

interface Friend {
  id: string
  name: string
  email: string
  image?: string
}

interface TransactionGroup {
  id: string
  expenses: Expense[]
  totalAmount: number
  date: string
  participants: string[]
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendRequests, setFriendRequests] = useState<Array<{ id: string; user: { id: string; name: string; email: string; image?: string }; status: string; createdAt: string }>>([])
  const [hasPassword, setHasPassword] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [friendExpenses, setFriendExpenses] = useState<Expense[]>([])
  const [isLoadingFriendExpenses, setIsLoadingFriendExpenses] = useState(false)

  useEffect(() => {
    console.log('[Dashboard] Session status changed:', { status, hasSession: !!session, userEmail: session?.user?.email })
    
    if (status === 'unauthenticated') {
      console.log('[Dashboard] User not authenticated, redirecting to signin')
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      console.log('[Dashboard] User authenticated:', { 
        id: session?.user?.id, 
        email: session?.user?.email,
        name: session?.user?.name 
      })
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchExpenses()
      fetchFriends()
      fetchFriendRequests()
      checkHasPassword()
    }
  }, [status, dateRange, customStartDate, customEndDate])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      let url = `/api/expenses?dateRange=${dateRange}`
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends')
      if (response.ok) {
        const data = await response.json()
        setFriends(data)
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests')
      if (response.ok) {
        const data = await response.json()
        setFriendRequests(data)
      }
    } catch (error) {
      console.error('Failed to fetch friend requests:', error)
    }
  }

  const checkHasPassword = async () => {
    try {
      const response = await fetch('/api/users/password')
      if (response.ok) {
        const data = await response.json()
        setHasPassword(data.hasPassword)
      }
    } catch (error) {
      console.error('Failed to check password:', error)
    }
  }

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })

      if (response.ok) {
        await fetchFriendRequests()
        await fetchFriends()
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to accept friend request')
      }
    } catch (error) {
      setError('Failed to accept friend request')
    }
  }

  const handleFriendClick = async (friendId: string, friendName: string) => {
    setSelectedFriendId(friendId)
    setIsLoadingFriendExpenses(true)
    
    try {
      const response = await fetch('/api/expenses?dateRange=all')
      if (response.ok) {
        const data = await response.json()
        const expensesWithFriend = data.filter((expense: Expense) => 
          expense.paidBy === friendName || expense.splitWith.includes(friendName)
        )
        setFriendExpenses(expensesWithFriend.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        }).slice(0, 10)) // Show most recent 10
      }
    } catch (error) {
      console.error('Failed to fetch friend expenses:', error)
      setFriendExpenses([])
    } finally {
      setIsLoadingFriendExpenses(false)
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
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (response.ok) {
        setShowChangePassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to change password')
      }
    } catch (error) {
      setError('Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Group expenses by transactionGroupId
  const groupExpenses = (expenses: Expense[]): (Expense | TransactionGroup)[] => {
    const groups = new Map<string, Expense[]>()
    const ungrouped: Expense[] = []

    expenses.forEach(expense => {
      if (expense.transactionGroupId) {
        if (!groups.has(expense.transactionGroupId)) {
          groups.set(expense.transactionGroupId, [])
        }
        groups.get(expense.transactionGroupId)!.push(expense)
      } else {
        ungrouped.push(expense)
      }
    })

    const transactionGroups: TransactionGroup[] = Array.from(groups.entries()).map(([id, groupExpenses]) => {
      const allParticipants = new Set<string>()
      groupExpenses.forEach(e => {
        allParticipants.add(e.paidBy)
        e.splitWith.forEach(p => allParticipants.add(p))
      })

      return {
        id,
        expenses: groupExpenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        totalAmount: groupExpenses.reduce((sum, e) => sum + e.amount, 0),
        date: groupExpenses[0].date,
        participants: Array.from(allParticipants),
      }
    })

    return [...transactionGroups, ...ungrouped].sort((a, b) => {
      const dateA = 'expenses' in a ? a.expenses[0].date : a.date
      const dateB = 'expenses' in b ? b.expenses[0].date : b.date
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }

  const recentExpenses = expenses.slice(0, 5)
  const totalSpent = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const allExpenses = groupExpenses(expenses)

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) return

    try {
      setIsAddingFriend(true)
      setError(null)
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: friendEmail }),
      })

      if (response.ok) {
        await fetchFriendRequests()
        setFriendEmail('')
        setShowAddFriendModal(false)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add friend')
      }
    } catch (error) {
      setError('Failed to add friend')
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleUnfriend = async (friendId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchFriends()
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to remove friend')
      }
    } catch (error) {
      setError('Failed to remove friend')
    }
  }

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId)
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId)
  }


  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      setError('please type "delete" to confirm')
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete account')
      }

      await signOut({ callbackUrl: '/auth/signin' })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  const calculateGroupBreakdown = (group: TransactionGroup) => {
    const balances: Record<string, { paid: number; owes: number; share: number }> = {}
    
    group.participants.forEach(p => {
      balances[p] = { paid: 0, owes: 0, share: 0 }
    })

    group.expenses.forEach(expense => {
      const perPersonShare = expense.amount / expense.splitWith.length
      
      // Track who paid
      balances[expense.paidBy].paid += expense.amount
      
      // Track who owes
      expense.splitWith.forEach(person => {
        balances[person].share += perPersonShare
        if (person !== expense.paidBy) {
          balances[person].owes += perPersonShare
        }
      })
    })

    return balances
  }

  return (
    <div className="min-h-screen bg-foreground">
      {/* Floating Add Expense Button */}
      <Link
        href="/calculator"
        className="fixed bottom-8 right-8 w-14 h-14 border-2 border-background bg-foreground text-background flex items-center justify-center text-2xl font-bold transition-colors hover:bg-background hover:text-foreground z-40"
        title="add expense"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-500 rounded">
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-500/70 hover:text-red-500"
            >
              dismiss
            </button>
          </div>
        )}

        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">dashboard</h1>
          <p className="text-sm text-background/50 font-medium">your spending overview</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-12">
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                if (e.target.value !== 'custom') {
                  setShowCustomDateRange(false)
                  setCustomStartDate('')
                  setCustomEndDate('')
                } else {
                  setShowCustomDateRange(true)
                }
              }}
              className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background transition-colors cursor-pointer"
              style={{
                colorScheme: 'dark',
              }}
            >
              <option value="thisMonth" className="bg-foreground text-background">this month</option>
              <option value="lastMonth" className="bg-foreground text-background">last month</option>
              <option value="thisYear" className="bg-foreground text-background">this year</option>
              <option value="all" className="bg-foreground text-background">all time</option>
              <option value="custom" className="bg-foreground text-background">custom range</option>
            </select>
            
            {showCustomDateRange && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background"
                  style={{ colorScheme: 'dark' }}
                />
                <span className="text-background/50">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Total Spent */}
        <div className="mb-16 border-b border-background/20 pb-8">
          <p className="text-sm text-background/50 font-medium mb-3">total spent</p>
          <p className="text-5xl md:text-6xl font-bold text-background">₱{totalSpent.toFixed(2)}</p>
        </div>

        {/* Recent Expenses */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-background">recent expenses</h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-background/70 transition-colors hover:text-background"
            >
              {showHistory ? 'hide all' : 'see all →'}
            </button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <p className="text-background/50 text-sm">loading...</p>
            ) : recentExpenses.length === 0 ? (
              <p className="text-background/50 text-sm">no expenses in this period</p>
            ) : (
              recentExpenses.map(expense => (
                <div key={expense.id} className="border-b border-background/20 pb-4">
                  <button
                    onClick={() => toggleExpense(expense.id)}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex-1">
                      <p className="text-lg font-bold text-background">{expense.name}</p>
                      <p className="text-sm text-background/50 mt-1">
                        {expense.date} • {expense.budget || 'no budget'} • {expense.paidBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-background">₱{expense.amount.toFixed(2)}</p>
                      {expandedExpense === expense.id ? (
                        <ChevronUp className="h-5 w-5 text-background/40" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-background/40" />
                      )}
                    </div>
                  </button>

                  {expandedExpense === expense.id && (
                    <div className="mt-4 pl-4 border-l border-background/20 space-y-2">
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">type:</span> {expense.type}
                      </p>
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">budget:</span> {expense.budget || 'no budget'}
                      </p>
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">paid by:</span> {expense.paidBy}
                      </p>
                      {expense.splitWith.length > 0 && (
                        <p className="text-sm text-background/50">
                          <span className="font-medium text-background">split with:</span> {expense.splitWith.join(', ')}
                        </p>
                      )}
                      <p className="text-sm text-background/50">
                        <span className="font-medium text-background">amount per person:</span> ₱{(expense.amount / (expense.splitWith.length || 1)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* History Section - Expandable */}
        {showHistory && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-background mb-8">all expenses</h2>

            <div className="space-y-4">
              {isLoading ? (
                <p className="text-background/50 text-sm">loading...</p>
              ) : allExpenses.length === 0 ? (
                <p className="text-background/50 text-sm">no expenses in this period</p>
              ) : (
                allExpenses.map((item) => {
                  if ('expenses' in item) {
                    // Transaction Group
                    const group = item as TransactionGroup
                    const breakdown = calculateGroupBreakdown(group)
                    return (
                      <div key={group.id} className="border-b border-background/20 pb-4">
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex-1">
                            <p className="text-lg font-bold text-background">
                              {group.expenses.length} shared {group.expenses.length === 1 ? 'purchase' : 'purchases'}
                            </p>
                            <p className="text-sm text-background/50 mt-1">
                              {group.date} • {group.participants.join(', ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-xl font-bold text-background">₱{group.totalAmount.toFixed(2)}</p>
                            {expandedGroup === group.id ? (
                              <ChevronUp className="h-5 w-5 text-background/40" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-background/40" />
                            )}
                          </div>
                        </button>

                        {expandedGroup === group.id && (
                          <div className="mt-4 pl-4 border-l border-background/20 space-y-6">
                            <div>
                              <h3 className="text-base font-bold text-background mb-3">items</h3>
                              <div className="space-y-3">
                                {group.expenses.map(expense => (
                                  <div key={expense.id} className="pb-3 border-b border-background/10">
                                    <p className="text-sm font-medium text-background">{expense.name}</p>
                                    <p className="text-xs text-background/50 mt-1">
                                      ₱{expense.amount.toFixed(2)} • paid by {expense.paidBy} • split with {expense.splitWith.join(', ')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="text-base font-bold text-background mb-3">breakdown</h3>
                              <div className="space-y-2">
                                {Object.entries(breakdown).map(([person, balance]) => (
                                  <div key={person} className="text-sm">
                                    <p className="font-medium text-background">{person}</p>
                                    <div className="ml-4 space-y-1 text-xs text-background/70">
                                      <p>paid: ₱{balance.paid.toFixed(2)}</p>
                                      <p>share: ₱{balance.share.toFixed(2)}</p>
                                      {balance.paid > balance.share ? (
                                        <p className="text-green-400">owed: ₱{(balance.paid - balance.share).toFixed(2)}</p>
                                      ) : balance.share > balance.paid ? (
                                        <p className="text-red-400">owes: ₱{(balance.share - balance.paid).toFixed(2)}</p>
                                      ) : (
                                        <p className="text-background/50">settled</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    // Single Expense
                    const expense = item as Expense
                    return (
                      <div key={expense.id} className="border-b border-background/20 pb-4">
                        <button
                          onClick={() => toggleExpense(expense.id)}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex-1">
                            <p className="text-lg font-bold text-background">{expense.name}</p>
                            <p className="text-sm text-background/50 mt-1">
                              {expense.date} • {expense.budget || 'no budget'} • {expense.paidBy}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-xl font-bold text-background">₱{expense.amount.toFixed(2)}</p>
                            {expandedExpense === expense.id ? (
                              <ChevronUp className="h-5 w-5 text-background/40" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-background/40" />
                            )}
                          </div>
                        </button>

                        {expandedExpense === expense.id && (
                          <div className="mt-4 pl-4 border-l border-background/20 space-y-2">
                            <p className="text-sm text-background/50">
                              <span className="font-medium text-background">type:</span> {expense.type}
                            </p>
                            <p className="text-sm text-background/50">
                              <span className="font-medium text-background">budget:</span> {expense.budget || 'no budget'}
                            </p>
                            <p className="text-sm text-background/50">
                              <span className="font-medium text-background">paid by:</span> {expense.paidBy}
                            </p>
                            {expense.splitWith.length > 0 && (
                              <p className="text-sm text-background/50">
                                <span className="font-medium text-background">split with:</span> {expense.splitWith.join(', ')}
                              </p>
                            )}
                            <p className="text-sm text-background/50">
                              <span className="font-medium text-background">amount per person:</span> ₱{(expense.amount / (expense.splitWith.length || 1)).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  }
                })
              )}
            </div>
          </div>
        )}

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-background mb-8">friend requests</h2>
            <div className="space-y-4">
              {friendRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-4 border-b border-background/20"
                >
                  <div>
                    <p className="text-lg font-bold text-background">{request.user.name}</p>
                    <p className="text-sm text-background/50">{request.user.email}</p>
                  </div>
                  <button
                    onClick={() => handleAcceptFriendRequest(request.id)}
                    className="text-sm text-background/70 transition-colors hover:text-background border border-background/30 px-4 py-2 rounded"
                  >
                    accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-background">friends</h2>
            <button
              onClick={() => setShowAddFriendModal(true)}
              className="p-2 text-background/40 transition-colors hover:text-background"
              title="add friend"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {friends.length === 0 ? (
              <p className="text-background/50 text-sm">no friends yet</p>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between py-4 border-b border-background/20"
                >
                  <div className="flex-1">
                    <button
                      onClick={() => handleFriendClick(friend.id, friend.name)}
                      className="text-lg font-bold text-background hover:opacity-70 transition underline decoration-background/30 hover:decoration-background text-left"
                    >
                      {friend.name}
                    </button>
                    <p className="text-sm text-background/50">{friend.email}</p>
                  </div>
                  <button
                    onClick={() => handleUnfriend(friend.id)}
                    className="text-sm text-background/70 transition-colors hover:text-background"
                  >
                    unfriend
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settings Section - Expandable */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-background">settings</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-background/70 transition-colors hover:text-background"
            >
              {showSettings ? 'hide' : 'show →'}
            </button>
          </div>

          {showSettings && (
            <div className="space-y-12">
              {/* Change Password */}
              {hasPassword && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="text-xl font-bold text-background">change password</h3>
                  </div>

                  {!showChangePassword ? (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="border-2 border-background/30 py-3 px-6 text-base font-medium text-background transition-colors hover:border-background"
                    >
                      change password
                    </button>
                  ) : (
                    <div className="space-y-6 max-w-md">
                      <div>
                        <h4 className="text-sm font-medium text-background/50 mb-2">current password</h4>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-background/50 mb-2">new password</h4>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-background/50 mb-2">confirm new password</h4>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowChangePassword(false)
                            setCurrentPassword('')
                            setNewPassword('')
                            setConfirmNewPassword('')
                            setError(null)
                          }}
                          className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                        >
                          cancel
                        </button>
                        <button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                          className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
                        >
                          {isChangingPassword ? 'changing...' : 'change password'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delete Account */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Trash2 className="h-5 w-5 text-background" />
                  <h3 className="text-xl font-bold text-background">delete account</h3>
                </div>

                {!showDeleteAccount ? (
                  <button
                    onClick={() => setShowDeleteAccount(true)}
                    className="border-2 border-red-500/50 py-3 px-6 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-background"
                  >
                    delete account
                  </button>
                ) : (
                  <div className="space-y-6 max-w-md">
                    <p className="text-sm text-background/70">
                      this action cannot be undone. type "delete" to confirm.
                    </p>
                    <div>
                      <input
                        type="text"
                        placeholder="type 'delete' to confirm"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteAccount(false)
                          setDeleteConfirm('')
                        }}
                        className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                      >
                        cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="flex-1 border-2 border-red-500/50 py-3 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-background disabled:opacity-50"
                      >
                        {isDeleting ? 'deleting...' : 'delete account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowAddFriendModal(false)}>
          <div className="w-full max-w-lg border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-background mb-6">add friend</h2>
            <div className="space-y-6">
              <div>
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddFriendModal(false)
                    setFriendEmail('')
                  }}
                  className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                >
                  cancel
                </button>
                <button
                  onClick={handleAddFriend}
                  disabled={isAddingFriend}
                  className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
                >
                  {isAddingFriend ? 'adding...' : 'add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friend Expenses Modal */}
      {selectedFriendId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => {
          setSelectedFriendId(null)
          setFriendExpenses([])
        }}>
          <div className="w-full max-w-2xl border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-background">
                {friends.find(f => f.id === selectedFriendId)?.name || 'Friend'}
              </h2>
              <button
                onClick={() => {
                  setSelectedFriendId(null)
                  setFriendExpenses([])
                }}
                className="text-background/40 hover:text-background transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-background mb-4">recent purchases</h3>
            
            {isLoadingFriendExpenses ? (
              <p className="text-background/50 text-sm">loading...</p>
            ) : friendExpenses.length === 0 ? (
              <p className="text-background/50 text-sm">no purchases yet</p>
            ) : (
              <div className="space-y-4">
                {friendExpenses.map(expense => (
                  <div key={expense.id} className="border-b border-background/20 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-background">{expense.name}</p>
                        <p className="text-sm text-background/50 mt-1">
                          {expense.date} • ₱{expense.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-background/40 mt-1">
                          {expense.paidBy === friends.find(f => f.id === selectedFriendId)?.name ? 'paid by them' : 'split with them'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
