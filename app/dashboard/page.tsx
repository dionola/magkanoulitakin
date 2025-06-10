'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { CATEGORIES, getCategoryIcon } from '@/lib/utils/categories'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Expense, Friend, TransactionGroup } from '@/lib/types'
import { getExpenses, createExpense, updateMe, updatePassword, deleteAccount } from '@/lib/api'
import { calculateSettlements, getExpenseTotals } from '@/lib/utils/settlements'
import { useTheme } from '@/components/providers/theme-provider'
import { useExpenses } from '@/hooks/useExpenses'
import { useFriends } from '@/hooks/useFriends'
import { useFriendRequests } from '@/hooks/useFriendRequests'
import { useUserPassword } from '@/hooks/useUserPassword'
import { ErrorBanner } from '@/components/dashboard/ErrorBanner'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'

export default function Dashboard() {
  const router = useRouter()
  const { data: session, status, update: updateSession } = useSession()
  const { darkMode } = useTheme()
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
  const [detailModal, setDetailModal] = useState<Expense[] | null>(null)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [categorySuggestionsOpen, setCategorySuggestionsOpen] = useState(false)
  const [isAddingExpense, setIsAddingExpense] = useState(false)

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
    .map(([dateStr, amount]) => ({ date: new Date(dateStr).getTime(), dateStr, amount }))
    .sort((a, b) => a.date - b.date)
    .slice(-365)

  const trajectoryMonthTicks = (() => {
    if (!trajectoryData.length) return []
    const ticks: number[] = []
    const start = new Date(trajectoryData[0].date)
    const end = new Date(trajectoryData[trajectoryData.length - 1].date)
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      ticks.push(cur.getTime())
      cur.setMonth(cur.getMonth() + 1)
    }
    return ticks
  })()

  // Calculate monthly spending
  const monthlySpending = expenses
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)

  const monthlyData = Object.entries(monthlySpending)
    .map(([key, amount]) => ({
      month: new Date(key + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount,
      key,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12)

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

  const handleAddExpense = async () => {
    if (!newExpenseName.trim() || !newExpenseAmount) return
    setIsAddingExpense(true)
    setError(null)
    try {
      await createExpense({
        name: newExpenseName.trim(),
        amount: parseFloat(newExpenseAmount),
        date: newExpenseDate,
        paidBy: displayName || session?.user?.name || 'me',
        splitWith: [],
        category: newExpenseCategory || undefined,
      })
      setNewExpenseName('')
      setNewExpenseAmount('')
      setNewExpenseDate(new Date().toISOString().split('T')[0])
      setNewExpenseCategory('')
      setShowAddExpense(false)
      await fetchExpenses()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense')
    } finally {
      setIsAddingExpense(false)
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
    <div className="min-h-screen bg-background">
      {/* Floating Add Expense Button */}
      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-8 right-8 w-14 h-14 border-2 border-foreground bg-background text-foreground flex items-center justify-center transition-colors hover:bg-foreground hover:text-background z-40"
        title="add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl mb-2">dashboard</h1>
          <p className="text-sm text-foreground/50 font-medium">your spending overview</p>
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
        <div className="mb-16 border-b border-foreground/20 pb-8">
          <p className="text-sm text-foreground/50 font-medium mb-3">total spent</p>
          <p className="text-5xl md:text-6xl font-bold text-foreground">₱{totalSpent.toFixed(2)}</p>
        </div>

        {/* Charts Section */}
        {expenses.length > 0 && (
          <div className="mb-16 space-y-12">
            {/* Spending by Category */}
            {categoryData.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">spending by category</h2>
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
                        fill={darkMode ? '#fff' : '#111'}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `₱${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: darkMode ? '#111' : '#fff', border: `1px solid ${darkMode ? '#333' : '#ddd'}`, borderRadius: '4px' }}
                        labelStyle={{ color: darkMode ? '#fff' : '#111' }}
                        itemStyle={{ color: darkMode ? '#fff' : '#111' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Spending Trajectory */}
            {trajectoryData.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">spending trajectory</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="date"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        stroke="#888"
                        tick={{ fill: '#888', fontSize: 11 }}
                        ticks={trajectoryMonthTicks}
                        tickFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      />
                      <YAxis
                        stroke="#888"
                        tick={{ fill: '#888' }}
                        tickFormatter={(value) => `₱${value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => `₱${value.toFixed(2)}`}
                        labelFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        contentStyle={{ backgroundColor: darkMode ? '#111' : '#fff', border: `1px solid ${darkMode ? '#333' : '#ddd'}`, borderRadius: '4px' }} labelStyle={{ color: darkMode ? '#fff' : '#111' }} itemStyle={{ color: darkMode ? '#fff' : '#111' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: '#8884d8', r: 4, cursor: 'pointer' }}
                        activeDot={{
                          r: 6, cursor: 'pointer',
                          onClick: (_: unknown, payload: { payload: { dateStr: string } }) => {
                            const hits = expenses.filter(e => e.date === payload.payload.dateStr)
                            if (hits.length) setDetailModal(hits)
                          }
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Monthly Spending Comparison */}
            {monthlyData.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">monthly spending</h2>
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
                        contentStyle={{ backgroundColor: darkMode ? '#111' : '#fff', border: `1px solid ${darkMode ? '#333' : '#ddd'}`, borderRadius: '4px' }} labelStyle={{ color: darkMode ? '#fff' : '#111' }} itemStyle={{ color: darkMode ? '#fff' : '#111' }}
                      />
                      <Bar dataKey="amount" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">transactions</h2>
            {expenses.length > 5 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                {showHistory ? 'show less' : 'see all →'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <p className="text-foreground/50 text-sm">loading...</p>
            ) : allExpenses.length === 0 ? (
              <p className="text-foreground/50 text-sm">no expenses in this period</p>
            ) : (
              (showHistory ? allExpenses : allExpenses.slice(0, 5)).map((item) => {
                  if ('expenses' in item) {
                    // Transaction Group
                    const group = item as TransactionGroup
                    return (
                      <div key={group.id} className="border-b border-foreground/20 pb-4">
                        <button
                          onClick={() => setDetailModal(group.expenses)}
                          className="w-full flex items-center justify-between text-left hover:opacity-70 transition"
                        >
                          <div className="flex-1">
                            <p className="text-lg font-bold text-foreground">
                              {group.expenses.length} shared {group.expenses.length === 1 ? 'purchase' : 'purchases'}
                            </p>
                            <p className="text-sm text-foreground/50 mt-1">
                              {group.date} • {group.participants.join(', ')}
                            </p>
                          </div>
                          <p className="text-xl font-bold text-foreground">₱{group.totalAmount.toFixed(2)}</p>
                        </button>

                      </div>
                    )
                  } else {
                    // Single Expense
                    const expense = item as Expense
                    return (
                      <div key={expense.id} className="border-b border-foreground/20 pb-4">
                        <button
                          onClick={() => setDetailModal([expense])}
                          className="w-full flex items-center justify-between text-left hover:opacity-70 transition"
                        >
                          <div className="flex-1">
                            <p className="text-lg font-bold text-foreground">{expense.name}</p>
                            <p className="text-sm text-foreground/50 mt-1 flex items-center gap-1 flex-wrap">
                              <span>{expense.date}</span>
                              {expense.category && (() => { const Icon = getCategoryIcon(expense.category); return <span className="flex items-center gap-1">• {Icon && <Icon className="h-3 w-3" />}{expense.category}</span> })()}
                              <span>• {expense.paidBy}</span>
                            </p>
                          </div>
                          <p className="text-xl font-bold text-foreground">₱{expense.amount.toFixed(2)}</p>
                        </button>
                      </div>
                    )
                  }
                })
              )}
          </div>
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8">friend requests</h2>
            <div className="space-y-4">
              {friendRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between py-4 border-b border-foreground/20"
                >
                  <div>
                    <p className="text-lg font-bold text-foreground">{request.user.name}</p>
                    <p className="text-sm text-foreground/50">{request.user.email}</p>
                  </div>
                  <button
                    onClick={() => handleAcceptFriendRequest(request.id)}
                    className="text-sm text-foreground/70 transition-colors hover:text-foreground border border-foreground/30 px-4 py-2 rounded"
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
            <h2 className="text-2xl font-bold text-foreground">friends</h2>
            <button
              onClick={() => setShowAddFriendModal(true)}
              className="p-2 text-foreground/40 transition-colors hover:text-foreground"
              title="add friend"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {friends.length === 0 ? (
              <p className="text-foreground/50 text-sm">no friends yet</p>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between py-4 border-b border-foreground/20"
                >
                  <div className="flex-1">
                    <button
                      onClick={() => handleFriendClick(friend.id, friend.name)}
                      className="text-lg font-bold text-foreground hover:opacity-70 transition underline decoration-background/30 hover:decoration-background text-left"
                    >
                      {friend.name}
                    </button>
                    <p className="text-sm text-foreground/50">{friend.email}</p>
                  </div>
                  <button
                    onClick={() => onUnfriend(friend.id)}
                    className="text-sm text-foreground/70 transition-colors hover:text-foreground"
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
          <h2 className="text-2xl font-bold text-foreground mb-8">settings</h2>
          <div className="space-y-12">
            <div className="space-y-12">
              {/* Change Name */}
              <div>
                {!showChangeName ? (
                  <button
                    onClick={() => {
                      setNewName(displayName || session?.user?.name || '')
                      setShowChangeName(true)
                    }}
                    className="border-2 border-foreground/30 py-3 px-6 text-left transition-colors hover:border-foreground"
                  >
                    <span className="block text-base font-bold text-foreground">change name</span>
                    <span className="block text-sm text-foreground/50 mt-0.5">{displayName || session?.user?.name || 'N/A'}</span>
                  </button>
                ) : (
                  <div className="space-y-6 max-w-md">
                    <div>
                      <h4 className="text-sm font-medium text-foreground/50 mb-2">new name</h4>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowChangeName(false)
                          setNewName('')
                          setError(null)
                        }}
                        className="flex-1 border-2 border-foreground/30 py-3 text-base font-medium text-foreground/70 transition-colors hover:border-foreground hover:text-foreground"
                      >
                        cancel
                      </button>
                      <button
                        onClick={handleChangeName}
                        disabled={isChangingName}
                        className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-foreground disabled:opacity-50"
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
                  {!showChangePassword ? (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="border-2 border-foreground/30 py-3 px-6 text-base font-bold text-foreground transition-colors hover:border-foreground"
                    >
                      change password
                    </button>
                  ) : (
                    <div className="space-y-6 max-w-md">
                      <div>
                        <h4 className="text-sm font-medium text-foreground/50 mb-2">current password</h4>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground/50 mb-2">new password</h4>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground/50 mb-2">confirm new password</h4>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
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
                          className="flex-1 border-2 border-foreground/30 py-3 text-base font-medium text-foreground/70 transition-colors hover:border-foreground hover:text-foreground"
                        >
                          cancel
                        </button>
                        <button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                          className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-foreground disabled:opacity-50"
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
                {!showDeleteAccount ? (
                  <button
                    onClick={() => setShowDeleteAccount(true)}
                    className="border-2 border-red-500/50 py-3 px-6 text-base font-bold text-red-500 transition-colors hover:bg-red-500 hover:text-foreground"
                  >
                    delete account
                  </button>
                ) : (
                  <div className="space-y-6 max-w-md">
                    <p className="text-sm text-foreground/70">
                      this action cannot be undone. type "delete" to confirm.
                    </p>
                    <div>
                      <input
                        type="text"
                        placeholder="type 'delete' to confirm"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteAccount(false)
                          setDeleteConfirm('')
                        }}
                        className="flex-1 border-2 border-foreground/30 py-3 text-base font-medium text-foreground/70 transition-colors hover:border-foreground hover:text-foreground"
                      >
                        cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="flex-1 border-2 border-red-500/50 py-3 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-foreground disabled:opacity-50"
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
            <div className="w-full max-w-lg border border-foreground/20 bg-secondary p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-foreground mb-6">add friend</h2>
              <div className="space-y-6">
                <div>
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onAddFriend()}
                    className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddFriendModal(false)
                      setFriendEmail('')
                    }}
                    className="flex-1 border-2 border-foreground/30 py-3 text-base font-medium text-foreground/70 transition-colors hover:border-foreground hover:text-foreground"
                  >
                    cancel
                  </button>
                  <button
                    onClick={onAddFriend}
                    disabled={isAddingFriend}
                    className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-foreground disabled:opacity-50"
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
            <div className="w-full max-w-2xl border border-foreground/20 bg-secondary p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {friends.find(f => f.id === selectedFriendId)?.name || 'Friend'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedFriendId(null)
                    setFriendExpenses([])
                  }}
                  className="text-foreground/40 hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-4">recent purchases</h3>

              {isLoadingFriendExpenses ? (
                <p className="text-foreground/50 text-sm">loading...</p>
              ) : friendExpenses.length === 0 ? (
                <p className="text-foreground/50 text-sm">no purchases yet</p>
              ) : (
                <div className="space-y-4">
                  {friendExpenses.map(expense => (
                    <div key={expense.id} className="border-b border-foreground/20 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-foreground">{expense.name}</p>
                          <p className="text-sm text-foreground/50 mt-1">
                            {expense.date} • ₱{expense.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-foreground/40 mt-1">
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

      {/* Expense Detail Modal */}
      {detailModal && (() => {
        const participantSet = new Set<string>()
        detailModal.forEach(e => {
          participantSet.add(e.paidBy)
          e.splitWith.forEach(p => participantSet.add(p))
        })
        const people = Array.from(participantSet).map(name => ({ id: name, name }))
        const normalised = detailModal.map(e => ({
          id: e.id, name: e.name, amount: e.amount, paidBy: e.paidBy,
          splitWith: e.splitWith.includes(e.paidBy) ? e.splitWith : [e.paidBy, ...e.splitWith],
          splitType: 'equal' as const, splitData: {} as Record<string, number>,
        }))
        const totals = getExpenseTotals(people, normalised)
        const settlements = calculateSettlements(people, normalised)

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDetailModal(null)} />
            <div className="relative bg-background text-foreground w-full max-w-md p-8 shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">expenses</h2>
                <button onClick={() => setDetailModal(null)} className="text-foreground/50 hover:text-foreground transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Expenses list */}
              <div className="space-y-4 mb-10">
                {detailModal.map(expense => {
                  const CatIcon = expense.category ? getCategoryIcon(expense.category) : null
                  const totalPeople = expense.splitWith.includes(expense.paidBy) ? expense.splitWith.length : expense.splitWith.length + 1
                  return (
                    <div key={expense.id} className="flex items-start justify-between border-b border-foreground/10 pb-4">
                      <div>
                        <p className="text-lg font-bold">{expense.name}</p>
                        <p className="text-sm text-foreground/50 mt-1 flex items-center gap-1 flex-wrap">
                          <span>{expense.paidBy} paid · {totalPeople} {totalPeople === 1 ? 'person' : 'people'}</span>
                          {expense.category && (
                            <span className="flex items-center gap-1">· {CatIcon && <CatIcon className="h-3 w-3" />}{expense.category}</span>
                          )}
                        </p>
                      </div>
                      <p className="text-lg font-bold shrink-0 ml-4">₱{expense.amount.toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              {people.length > 1 && (
                <>
                  <h3 className="text-lg font-bold mb-4">summary</h3>
                  <div className="space-y-4 mb-10">
                    {people.map(({ id, name }) => {
                      const t = totals[id]
                      return (
                        <div key={id} className="border-b border-foreground/10 pb-4">
                          <p className="font-bold mb-1">{name}</p>
                          <div className="text-sm text-foreground/60 space-y-0.5">
                            <p>paid: ₱{t.paid.toFixed(2)} · owes: ₱{t.owes.toFixed(2)} · balance: <span className={t.balance >= 0 ? 'text-green-400' : 'text-red-400'}>₱{t.balance.toFixed(2)}</span></p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Settlements */}
                  {settlements.length > 0 && (
                    <>
                      <h3 className="text-lg font-bold mb-4">settlements</h3>
                      <div className="space-y-3">
                        {settlements.map((s, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-foreground/10 pb-3">
                            <p className="text-sm text-foreground/70">{s.from} pays {s.to}</p>
                            <p className="font-bold">₱{s.amount.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Add Expense Modal */}

      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowAddExpense(false)}>
          <div className="w-full max-w-lg border border-foreground/20 bg-secondary p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">add expense</h2>
              <button onClick={() => setShowAddExpense(false)} className="text-foreground/50 hover:text-foreground transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground/50 block mb-2">name</label>
                <input
                  autoFocus
                  type="text"
                  value={newExpenseName}
                  onChange={e => setNewExpenseName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
                  placeholder="e.g. Groceries"
                  className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/50 block mb-2">amount</label>
                <input
                  type="number"
                  value={newExpenseAmount}
                  onChange={e => setNewExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground placeholder:text-foreground/40 focus:border-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/50 block mb-2">date</label>
                <input
                  type="date"
                  value={newExpenseDate}
                  onChange={e => setNewExpenseDate(e.target.value)}
                  className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground focus:border-foreground focus:outline-none"
                />
              </div>
              <div className="relative">
                <label className="text-sm font-medium text-foreground/50 block mb-2">category</label>
                <button
                  type="button"
                  onClick={() => setCategorySuggestionsOpen(o => !o)}
                  className="w-full border-b-2 border-foreground/30 bg-transparent pb-3 text-lg text-foreground focus:border-foreground focus:outline-none text-left flex items-center justify-between"
                >
                  {newExpenseCategory ? (
                    <span className="flex items-center gap-2">
                      {(() => { const Icon = getCategoryIcon(newExpenseCategory); return Icon ? <Icon className="h-4 w-4 opacity-60" /> : null })()}
                      {newExpenseCategory}
                    </span>
                  ) : (
                    <span className="text-foreground/40">select category</span>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </button>
                {categorySuggestionsOpen && (
                  <div className="absolute top-full left-0 right-0 bg-background text-foreground border border-foreground/20 shadow-lg z-10">
                    {newExpenseCategory && (
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setNewExpenseCategory(''); setCategorySuggestionsOpen(false) }}
                        className="w-full text-left px-4 py-2 text-sm text-foreground/50 hover:bg-foreground/10 transition-colors border-b border-foreground/10"
                      >
                        clear
                      </button>
                    )}
                    {CATEGORIES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setNewExpenseCategory(value); setCategorySuggestionsOpen(false) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-foreground/10 transition-colors flex items-center gap-3"
                      >
                        <Icon className="h-4 w-4 opacity-60 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddExpense(false)}
                className="flex-1 border-2 border-foreground/30 py-3 text-base font-medium text-foreground/70 transition-colors hover:border-foreground hover:text-foreground"
              >
                cancel
              </button>
              <button
                onClick={handleAddExpense}
                disabled={isAddingExpense || !newExpenseName.trim() || !newExpenseAmount}
                className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
              >
                {isAddingExpense ? 'adding...' : 'add expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

