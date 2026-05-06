'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, X } from 'lucide-react'
import { CATEGORIES, getCategoryIcon } from '@/lib/utils/categories'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Expense, TransactionGroup } from '@/lib/types'
import { getExpenseShare } from '@/lib/utils/expense-shares'
import { useTheme } from '@/components/providers/theme-provider'
import { useExpenses } from '@/hooks/useExpenses'
import { useFriends } from '@/hooks/useFriends'
import { useFriendRequests } from '@/hooks/useFriendRequests'
import { useUserPassword } from '@/hooks/useUserPassword'
import { useDashboardState } from '@/hooks/useDashboardState'
import { ErrorBanner } from '@/components/dashboard/ErrorBanner'
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter'
import { ExpenseDetailModal } from '@/components/dashboard/ExpenseDetailModal'
import { QuickAddExpenseModal } from '@/components/dashboard/QuickAddExpenseModal'
import { Spinner } from '@/components/ui/spinner'
import {
  buildCategoryData,
  buildMonthlyData,
  buildTrajectoryData,
  buildTrajectoryMonthTicks,
  calculateGroupBreakdown,
  DASHBOARD_CHART_COLORS,
  groupExpenses,
} from '@/lib/utils/dashboard-data'

function DashboardListSkeleton({ invert = false, rows = 4 }: { invert?: boolean; rows?: number }) {
  const shimmerClass = invert ? 'bg-background/10' : 'bg-foreground/10'
  const borderClass = invert ? 'border-background/20' : 'border-foreground/20'

  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={`border-b ${borderClass} pb-4`}>
          <div className={`h-6 w-40 rounded-full ${shimmerClass} animate-pulse mb-2`} />
          <div className={`h-4 w-56 rounded-full ${shimmerClass} animate-pulse mb-3`} />
          <div className={`h-8 w-24 rounded-full ${shimmerClass} animate-pulse`} />
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session, status, update: updateSession } = useSession()
  const { darkMode } = useTheme()
  const authenticated = status === 'authenticated'

  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const {
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
  } = useDashboardState({
    authenticated,
    status,
    sessionName: session?.user?.name,
    router,
    updateSession,
    session,
  })

  const { expenses, isLoading } = useExpenses(dateRange, customStartDate, customEndDate, authenticated)
  const { friends, isAddingFriend, handleAddFriend, handleUnfriend } = useFriends(authenticated)
  const { friendRequests, handleAccept } = useFriendRequests(authenticated)
  const { hasPassword } = useUserPassword(authenticated)
  const selectedFriend = friends.find(friend => friend.id === selectedFriendId)
  const { expenses: allFriendCandidateExpenses, isLoading: isLoadingFriendExpenses } = useExpenses('all', '', '', authenticated && !!selectedFriendId)
  const friendExpenses = useMemo(() => {
    if (!selectedFriend) return []
    return allFriendCandidateExpenses
      .filter((expense) => expense.paidBy === selectedFriend.name || expense.splitWith.includes(selectedFriend.name))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  }, [allFriendCandidateExpenses, selectedFriend])

  const handleAcceptFriendRequest = async (requestId: string) => {
    const result = await handleAccept(requestId)
    if (result.ok) setError(null)
    else setError(result.error ?? 'Failed to accept friend request')
  }

  const handleFriendClick = (friendId: string) => {
    setSelectedFriendId(friendId)
  }

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

  const personalExpenses = expenses
  const recentExpenses = personalExpenses.slice(0, 5)
  const totalSpent = personalExpenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + getExpenseShare(e), 0)

  const allExpenses = groupExpenses(personalExpenses)
  const categoryData = buildCategoryData(personalExpenses)
  const trajectoryData = buildTrajectoryData(personalExpenses)
  const trajectoryMonthTicks = buildTrajectoryMonthTicks(trajectoryData)
  const monthlyData = buildMonthlyData(personalExpenses)

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId)
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(expandedGroup === groupId ? null : groupId)
  }
  return (
    <div className="min-h-dvh bg-background">
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
        {personalExpenses.length > 0 && (
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
                          <Cell key={`cell-${index}`} fill={DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length]} />
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
                        activeDot={(props: any) => (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={6}
                            fill="#8884d8"
                            cursor="pointer"
                            onClick={() => {
                              const hits = personalExpenses.filter(e => e.date === props.payload?.dateStr)
                              if (hits.length) setDetailModal(hits)
                            }}
                          />
                        )}
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
            {allExpenses.length > 5 && (
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
              <DashboardListSkeleton />
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
                              {group.name}
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
                          <p className="text-xl font-bold text-foreground">₱{getExpenseShare(expense).toFixed(2)}</p>
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
                      onClick={() => handleFriendClick(friend.id)}
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
                        className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-foreground disabled:opacity-50 flex items-center justify-center"
                      >
                        {isChangingName ? <Spinner /> : 'change name'}
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
                          className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-foreground disabled:opacity-50 flex items-center justify-center"
                        >
                          {isChangingPassword ? <Spinner /> : 'change password'}
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
                        className="flex-1 border-2 border-red-500/50 py-3 text-base font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-foreground disabled:opacity-50 flex items-center justify-center"
                      >
                        {isDeleting ? <Spinner /> : 'delete account'}
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
                    className="flex-1 border-2 border-foreground py-3 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-foreground disabled:opacity-50 flex items-center justify-center"
                  >
                    {isAddingFriend ? <Spinner /> : 'add'}
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
          }}>
            <div className="w-full max-w-2xl border border-foreground/20 bg-secondary p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  {friends.find(f => f.id === selectedFriendId)?.name || 'Friend'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedFriendId(null)
                  }}
                  className="text-foreground/40 hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-4">recent purchases</h3>

              {isLoadingFriendExpenses ? (
                <DashboardListSkeleton rows={3} />
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
                            {expense.date} • ₱{getExpenseShare(expense).toFixed(2)}
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

      <ExpenseDetailModal detailModal={detailModal} onClose={() => setDetailModal(null)} />

      <QuickAddExpenseModal
        isOpen={showAddExpense}
        newExpenseName={newExpenseName}
        newExpenseAmount={newExpenseAmount}
        newExpenseDate={newExpenseDate}
        newExpenseCategory={newExpenseCategory}
        categorySuggestionsOpen={categorySuggestionsOpen}
        isAddingExpense={isAddingExpense}
        onClose={() => setShowAddExpense(false)}
        onExpenseNameChange={setNewExpenseName}
        onExpenseAmountChange={setNewExpenseAmount}
        onExpenseDateChange={setNewExpenseDate}
        onCategoryToggle={() => setCategorySuggestionsOpen((open) => !open)}
        onCategoryChange={(value) => {
          setNewExpenseCategory(value)
          setCategorySuggestionsOpen(false)
        }}
        onSubmit={handleAddExpense}
        categories={CATEGORIES.map(category => category.value)}
      />
    </div>
  )
}
