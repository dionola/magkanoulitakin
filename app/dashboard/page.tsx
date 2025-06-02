'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Expense, Friend, TransactionGroup } from '@/lib/types'
import { getExpenses, updateMe, updatePassword, deleteAccount } from '@/lib/api'
import { useExpenses } from '@/hooks/useExpenses'
import { useFriends } from '@/hooks/useFriends'
import { useFriendRequests } from '@/hooks/useFriendRequests'
import { useUserPassword } from '@/hooks/useUserPassword'
import { ErrorBanner } from '@/components/dashboard/ErrorBanner'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'

export default function Dashboard() {
  const router = useRouter()
  const { data: session, status, update: updateSession } = useSession()
  const authenticated = status === 'authenticated'

  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
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

  const { expenses, isLoading, fetchExpenses } = useExpenses(
    dateRange,
    customStartDate,
    customEndDate,
    authenticated
  )
  const { friends, isAddingFriend, fetchFriends, handleAddFriend, handleUnfriend } = useFriends(authenticated)
  const { friendRequests, fetchFriendRequests, handleAccept } = useFriendRequests(authenticated)
  const { hasPassword } = useUserPassword(authenticated)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (authenticated && session?.user?.name) {
      setDisplayName(session.user.name)
    }
  }, [status, session, router, authenticated])

  const handleAcceptFriendRequest = async (requestId: string) => {
    const result = await handleAccept(requestId)
    if (result.ok) setError(null)
    else setError(result.error ?? 'Failed to accept friend request')
  }

  const handleFriendClick = async (friendId: string, friendName: string) => {
    setSelectedFriendId(friendId)
    setIsLoadingFriendExpenses(true)
    try {
      const data = await getExpenses({ dateRange: 'all' })
      const withFriend = data.filter(
        (e) => e.paidBy === friendName || e.splitWith.includes(friendName)
      )
      setFriendExpenses(
        withFriend
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10)
      )
    } catch {
      setFriendExpenses([])
    } finally {
      setIsLoadingFriendExpenses(false)
    }
  }

  const handleChangeName = async () => {
    if (!newName.trim()) {
      setError('Name cannot be empty')
      return
    }
    if (newName.trim() === session?.user?.name) {
      setShowChangeName(false)
      setNewName('')
      return
    }
    try {
      setIsChangingName(true)
      setError(null)
      await updateMe({ name: newName.trim() })
      setDisplayName(newName.trim())
      setShowChangeName(false)
      setNewName('')
      setError(null)
      if (updateSession) await updateSession()
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
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password')
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

  // Calculate spending by category
  const spendingByCategory = expenses
    .filter(e => e.type === 'expense' && e.category)
    .reduce((acc, e) => {
      const cat = e.category || 'uncategorized'
      acc[cat] = (acc[cat] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

  const categoryData = Object.entries(spendingByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Calculate spending trajectory (by day)
  const spendingByDate = expenses
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => {
      const date = e.date
      acc[date] = (acc[date] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

  const trajectoryData = Object.entries(spendingByDate)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30) // Last 30 days

  // Calculate monthly spending
  const monthlySpending = expenses
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => {
      const month = new Date(e.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      acc[month] = (acc[month] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

  const monthlyData = Object.entries(monthlySpending)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .slice(-6) // Last 6 months

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff00ff', '#ff0000', '#00ffff', '#ffff00']

  const onAddFriend = async () => {
    if (!friendEmail.trim()) return
    setError(null)
    const result = await handleAddFriend(friendEmail)
    if (result.ok) {
      setFriendEmail('')
      setShowAddFriendModal(false)
    } else {
      setError(result.error ?? 'Failed to add friend')
    }
  }

  const onUnfriend = async (friendId: string) => {
    setError(null)
    const result = await handleUnfriend(friendId)
    if (!result.ok) setError(result.error ?? 'Failed to remove friend')
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
      await deleteAccount()
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
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
        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">dashboard</h1>
          <p className="text-sm text-background/50 font-medium">your spending overview</p>
        </div>

        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
          showCustom={showCustomDateRange}
          onShowCustomChange={setShowCustomDateRange}
        />

        {/* Total Spent */}
        <div className="mb-16 border-b border-background/20 pb-8">
          <p className="text-sm text-background/50 font-medium mb-3">total spent</p>
          <p className="text-5xl md:text-6xl font-bold text-background">₱{totalSpent.toFixed(2)}</p>
        </div>

        {/* Charts Section */}
        {expenses.length > 0 && (
          <div className="mb-16 space-y-12">
            {/* Spending by Category */}
            {categoryData.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-background mb-6">spending by category</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `₱${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Spending Trajectory */}
            {trajectoryData.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-background mb-6">spending trajectory</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="date"
                        stroke="#888"
                        tick={{ fill: '#888' }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis
                        stroke="#888"
                        tick={{ fill: '#888' }}
                        tickFormatter={(value) => `₱${value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => `₱${value.toFixed(2)}`}
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: '#8884d8', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Monthly Spending Comparison */}
            {monthlyData.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-background mb-6">monthly spending</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="month"
                        stroke="#888"
                        tick={{ fill: '#888' }}
                      />
                      <YAxis
                        stroke="#888"
                        tick={{ fill: '#888' }}
                        tickFormatter={(value) => `₱${value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => `₱${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '4px' }}
                      />
                      <Bar dataKey="amount" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

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
                    onClick={() => onUnfriend(friend.id)}
                    className="text-sm text-background/70 transition-colors hover:text-background"
                  >
                    unfriend
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-background mb-8">settings</h2>
          <div className="space-y-12">
            <div className="space-y-12">
              {/* Change Name */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <h3 className="text-xl font-bold text-background">change name</h3>
                </div>

                {!showChangeName ? (
                  <div className="space-y-3">
                    <p className="text-sm text-background/70">current name: {displayName || session?.user?.name || 'N/A'}</p>
                    <button
                      onClick={() => {
                        setNewName(displayName || session?.user?.name || '')
                        setShowChangeName(true)
                      }}
                      className="border-2 border-background/30 py-3 px-6 text-base font-medium text-background transition-colors hover:border-background"
                    >
                      change name
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-md">
                    <div>
                      <h4 className="text-sm font-medium text-background/50 mb-2">new name</h4>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowChangeName(false)
                          setNewName('')
                          setError(null)
                        }}
                        className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                      >
                        cancel
                      </button>
                      <button
                        onClick={handleChangeName}
                        disabled={isChangingName}
                        className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
                      >
                        {isChangingName ? 'changing...' : 'change name'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
                    onKeyPress={(e) => e.key === 'Enter' && onAddFriend()}
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
                    onClick={onAddFriend}
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
    </div>
  )
}

