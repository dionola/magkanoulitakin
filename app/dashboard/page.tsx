'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'

interface Expense {
  id: string
  name: string
  amount: number
  date: string
  budget?: string
  paidBy: string
  splitWith: string[]
  type: 'expense' | 'settlement'
}

interface Friend {
  id: string
  name: string
  email: string
  image?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [dateRange, setDateRange] = useState('thisMonth')
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    paidBy: session?.user?.name || 'You',
    splitWith: [session?.user?.name || 'You'],
    budget: '',
  })
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingExpense, setIsAddingExpense] = useState(false)
  const [isAddingFriend, setIsAddingFriend] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchExpenses()
      fetchFriends()
    }
  }, [status, dateRange])

  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/expenses?dateRange=${dateRange}`)
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

  const recentExpenses = expenses.slice(0, 5)
  const totalSpent = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) return

    try {
      setIsAddingFriend(true)
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: friendEmail }),
      })

      if (response.ok) {
        await fetchFriends()
        setFriendEmail('')
        setShowAddFriendModal(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add friend')
      }
    } catch (error) {
      alert('Failed to add friend')
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleUnfriend = async (friendId: string) => {
    try {
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchFriends()
      } else {
        alert('Failed to remove friend')
      }
    } catch (error) {
      alert('Failed to remove friend')
    }
  }

  const toggleExpense = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId)
  }

  const allPeople = session?.user?.name ? [session.user.name, ...friends.map(f => f.name)] : ['You', ...friends.map(f => f.name)]

  const toggleSplitWith = (person: string) => {
    setNewExpense(prev => {
      if (prev.splitWith.includes(person)) {
        return { ...prev, splitWith: prev.splitWith.filter(p => p !== person) }
      } else {
        return { ...prev, splitWith: [...prev.splitWith, person] }
      }
    })
  }

  const selectAllSplitWith = () => {
    setNewExpense(prev => ({ ...prev, splitWith: allPeople }))
  }

  const handleAddExpense = async () => {
    if (!newExpense.name.trim() || !newExpense.amount || !newExpense.paidBy || newExpense.splitWith.length === 0) {
      return
    }

    try {
      setIsAddingExpense(true)
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExpense.name,
          amount: parseFloat(newExpense.amount),
          date: new Date().toISOString().split('T')[0],
          budget: newExpense.budget || undefined,
          paidBy: newExpense.paidBy,
          splitWith: newExpense.splitWith,
          type: 'expense',
        }),
      })

      if (response.ok) {
        await fetchExpenses()
        setShowAddExpenseModal(false)
        setNewExpense({
          name: '',
          amount: '',
          paidBy: session?.user?.name || 'You',
          splitWith: [session?.user?.name || 'You'],
          budget: '',
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add expense')
      }
    } catch (error) {
      alert('Failed to add expense')
    } finally {
      setIsAddingExpense(false)
    }
  }

  return (
    <div className="min-h-screen bg-foreground">
      {/* Floating Add Expense Button */}
      <button
        onClick={() => setShowAddExpenseModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 border-2 border-background bg-foreground text-background flex items-center justify-center text-2xl font-bold transition-colors hover:bg-background hover:text-foreground z-40"
        title="add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-background md:text-5xl mb-2">dashboard</h1>
          <p className="text-sm text-background/50 font-medium">your spending overview</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-12">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-foreground text-sm text-background border-b-2 border-background/30 pb-2 outline-none focus:border-background transition-colors cursor-pointer"
            style={{
              colorScheme: 'dark',
            }}
          >
            <option value="thisMonth" className="bg-foreground text-background">this month</option>
            <option value="lastMonth" className="bg-foreground text-background">last month</option>
            <option value="thisYear" className="bg-foreground text-background">this year</option>
            <option value="all" className="bg-foreground text-background">all time</option>
          </select>
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
            <Link
              href="/dashboard/history"
              className="text-sm text-background/70 transition-colors hover:text-background"
            >
              see all →
            </Link>
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
                        {expense.date} • {expense.budget} • {expense.paidBy}
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
                        <span className="font-medium text-background">budget:</span> {expense.budget}
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

        {/* Friends List */}
        <div className="mt-12">
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
                  <div>
                    <p className="text-lg font-bold text-background">{friend.name}</p>
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

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowAddExpenseModal(false)}>
          <div className="w-full max-w-lg border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-background mb-6">add expense</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">what</h3>
                <input
                  type="text"
                  placeholder="dinner"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">amount</h3>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  step="0.01"
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">budget</h3>
                <input
                  type="text"
                  placeholder="vacation trip"
                  value={newExpense.budget}
                  onChange={(e) => setNewExpense({ ...newExpense, budget: e.target.value })}
                  className="w-full border-b-2 border-background/30 bg-transparent pb-3 text-lg text-background placeholder:text-background/40 focus:border-background focus:outline-none"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">paid by</h3>
                <select
                  value={newExpense.paidBy}
                  onChange={(e) => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                  className="w-full bg-foreground text-lg text-background border-b-2 border-background/30 focus:border-background outline-none cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                >
                  {allPeople.map(person => (
                    <option key={person} value={person} className="bg-foreground text-background">
                      {person === session?.user?.name ? 'You' : person}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-background/50 mb-3">split between</h3>
                <div className="relative">
                  <button
                    onClick={() => setSplitDropdownOpen(!splitDropdownOpen)}
                    className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background text-left pb-2 flex justify-between items-center"
                  >
                    <span>{newExpense.splitWith.length === allPeople.length ? 'all' : `${newExpense.splitWith.length} selected`}</span>
                    <span className="text-background/40">▼</span>
                  </button>
                  {splitDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-foreground border border-background/20 z-10">
                      <button
                        onClick={() => {
                          selectAllSplitWith()
                          setSplitDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition border-b border-background/20"
                      >
                        select all
                      </button>
                      {allPeople.map(person => (
                        <label key={person} className="flex items-center gap-3 px-4 py-3 hover:bg-background/5 transition cursor-pointer border-b border-background/20 last:border-b-0">
                          <input
                            type="checkbox"
                            checked={newExpense.splitWith.includes(person)}
                            onChange={() => toggleSplitWith(person)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-base text-background flex-1">
                            {person === session?.user?.name ? 'You' : person}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowAddExpenseModal(false)
                    setNewExpense({
                      name: '',
                      amount: '',
                      paidBy: 'You',
                      splitWith: ['You'],
                      budget: '',
                    })
                  }}
                  className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                >
                  cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  disabled={isAddingExpense}
                  className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
                >
                  {isAddingExpense ? 'adding...' : 'add expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
