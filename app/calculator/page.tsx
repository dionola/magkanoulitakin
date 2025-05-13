'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Trash2, Plus, Moon, Sun, LogOut, LogIn, UserPlus, X } from 'lucide-react'

interface Person {
  id: string
  name: string
}

interface Expense {
  id: string
  name: string
  amount: number
  paidBy: string
  splitWith: string[]
  splitType: 'equal' | 'percentage' | 'exact'
  splitData: Record<string, number>
  date?: string
}

interface Friend {
  id: string
  name: string
  email: string
  image?: string
}

export default function Calculator() {
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated' && !!session

  // Get user's first name or "Me"
  const getUserDisplayName = () => {
    if (session?.user?.name) {
      const firstName = session.user.name.split(' ')[0]
      return firstName
    }
    return 'Me'
  }

  const initialPersonName = getUserDisplayName()
  const initialPeople = [{ id: 'user-current', name: initialPersonName }]

  const [people, setPeople] = useState<Person[]>(initialPeople)
  const [friends, setFriends] = useState<Friend[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [showFriendSuggestions, setShowFriendSuggestions] = useState(false)
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([])
  const [friendInteractions, setFriendInteractions] = useState<Record<string, number>>({})
  const [isPersonInputFocused, setIsPersonInputFocused] = useState(false)
  const [newExpenseName, setNewExpenseName] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpensePaidBy, setNewExpensePaidBy] = useState(initialPeople[0]?.id || '')
  const [newExpenseSplitWith, setNewExpenseSplitWith] = useState<string[]>(initialPeople.map(p => p.id))
  const [currency, setCurrency] = useState('₱')
  const [currencyCode, setCurrencyCode] = useState('PHP')
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ name: string; amount: string }>({ name: '', amount: '' })
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [editingPersonName, setEditingPersonName] = useState('')
  const [showReceiptScanner, setShowReceiptScanner] = useState(false)
  const [receiptExpenses, setReceiptExpenses] = useState<Array<{ id: string; name: string; amount: number; paidByPersonId: string | null }>>([])
  const [darkMode, setDarkMode] = useState(true)
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false)
  const [receiptDropdownOpen, setReceiptDropdownOpen] = useState<string | null>(null)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [friendExpenses, setFriendExpenses] = useState<Expense[]>([])
  const [isLoadingFriendExpenses, setIsLoadingFriendExpenses] = useState(false)
  const ENABLE_RECEIPT_SCANNER = false

  // Check if a person is a friend
  const isFriend = (personId: string) => {
    return friends.some(f => f.id === personId)
  }

  // Update initial person when session changes
  useEffect(() => {
    const displayName = getUserDisplayName()
    const currentUser = people.find(p => p.id === 'user-current')
    if (currentUser && currentUser.name !== displayName) {
      setPeople(prev => prev.map(p =>
        p.id === 'user-current' ? { ...p, name: displayName } : p
      ))
      setNewExpensePaidBy('user-current')
      setNewExpenseSplitWith(['user-current'])
    } else if (!currentUser) {
      // If user-current doesn't exist, add it
      const newPeople = [{ id: 'user-current', name: displayName }, ...people.filter(p => p.id !== 'user-current')]
      setPeople(newPeople)
      setNewExpensePaidBy('user-current')
      setNewExpenseSplitWith(['user-current'])
    }
  }, [session?.user?.name])

  // Load friend interactions from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('friendInteractions')
      if (stored) {
        try {
          setFriendInteractions(JSON.parse(stored))
        } catch (e) {
          console.error('Failed to parse friend interactions:', e)
        }
      }
    }
  }, [])

  // Save friend interactions to localStorage when updated
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(friendInteractions).length > 0) {
      localStorage.setItem('friendInteractions', JSON.stringify(friendInteractions))
    }
  }, [friendInteractions])

  // Fetch friends if logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchFriends()
    }
  }, [isLoggedIn])

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

  // Handle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Update friend interaction date
  const updateFriendInteraction = (friendId: string) => {
    setFriendInteractions(prev => ({
      ...prev,
      [friendId]: Date.now()
    }))
  }

  // Sort friends by most recent interaction
  const sortFriendsByInteraction = (friendsList: Friend[]): Friend[] => {
    return [...friendsList].sort((a, b) => {
      const aInteraction = friendInteractions[a.id] || 0
      const bInteraction = friendInteractions[b.id] || 0
      if (bInteraction !== aInteraction) {
        return bInteraction - aInteraction // Most recent first
      }
      return a.name.localeCompare(b.name) // Alphabetical if no interaction
    })
  }

  // Filter and sort friends based on input
  useEffect(() => {
    if (friends.length === 0) {
      setFilteredFriends([])
      setShowFriendSuggestions(false)
      return
    }

    const availableFriends = friends.filter(friend =>
      !people.find(p => p.id === friend.id || p.name === friend.name)
    )

    if (newPersonName.trim()) {
      // Filter by name match
      const filtered = availableFriends.filter(friend =>
        friend.name.toLowerCase().includes(newPersonName.toLowerCase())
      )
      const sorted = sortFriendsByInteraction(filtered)
      setFilteredFriends(sorted)
      setShowFriendSuggestions(sorted.length > 0 && isPersonInputFocused)
    } else if (isPersonInputFocused) {
      // Show all available friends when input is focused and empty
      const sorted = sortFriendsByInteraction(availableFriends)
      setFilteredFriends(sorted)
      setShowFriendSuggestions(sorted.length > 0)
    } else {
      setFilteredFriends([])
      setShowFriendSuggestions(false)
    }
  }, [newPersonName, friends, people, isPersonInputFocused, friendInteractions])

  const addPerson = (friendId?: string, friendName?: string) => {
    const nameToAdd = friendName || newPersonName.trim()
    if (nameToAdd) {
      // Check if person already exists
      const existingPerson = people.find(p => p.name.toLowerCase() === nameToAdd.toLowerCase())
      if (existingPerson) {
        setNewPersonName('')
        setShowFriendSuggestions(false)
        return
      }

      const newPerson = friendId
        ? { id: friendId, name: friendName! }
        : { id: Date.now().toString(), name: nameToAdd }

      setPeople([...people, newPerson])
      setNewExpenseSplitWith([...newExpenseSplitWith, newPerson.id])
      setNewPersonName('')
      setShowFriendSuggestions(false)

      // Update interaction date if it's a friend
      if (friendId) {
        updateFriendInteraction(friendId)
      }
    }
  }

  const handlePersonInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // If there's a filtered friend and user hasn't selected, create new person
      if (showFriendSuggestions && filteredFriends.length > 0) {
        // User pressed enter without selecting, create new person
        addPerson()
      } else {
        addPerson()
      }
    }
  }

  const removePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id))
  }

  const startEditPerson = (person: Person) => {
    // Don't allow editing friends
    if (isFriend(person.id)) {
      return
    }
    setEditingPersonId(person.id)
    setEditingPersonName(person.name)
  }

  const handleFriendClick = async (friendId: string, friendName: string) => {
    setSelectedFriendId(friendId)
    setIsLoadingFriendExpenses(true)

    // Get expenses from local state that include this friend
    const localExpensesWithFriend = expenses.filter(expense => {
      const paidByName = getPersonName(expense.paidBy)
      const splitWithNames = expense.splitWith.map(id => getPersonName(id))
      return paidByName === friendName || splitWithNames.includes(friendName)
    })

    // If logged in, also fetch from API
    if (isLoggedIn) {
      try {
        const response = await fetch('/api/expenses?dateRange=all')
        if (response.ok) {
          const data = await response.json()
          const apiExpensesWithFriend = data.filter((expense: any) =>
            expense.paidBy === friendName || expense.splitWith.includes(friendName)
          )
          // Combine and deduplicate
          const allExpenses = [...localExpensesWithFriend, ...apiExpensesWithFriend]
          const uniqueExpenses = Array.from(
            new Map(allExpenses.map(e => [e.id || e.name + e.amount + (e.date || ''), e])).values()
          )
          setFriendExpenses(uniqueExpenses.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0
            const dateB = b.date ? new Date(b.date).getTime() : 0
            return dateB - dateA
          }).slice(0, 10)) // Show most recent 10
        } else {
          setFriendExpenses(localExpensesWithFriend.slice(0, 10))
        }
      } catch (error) {
        console.error('Failed to fetch friend expenses:', error)
        setFriendExpenses(localExpensesWithFriend.slice(0, 10))
      }
    } else {
      setFriendExpenses(localExpensesWithFriend.slice(0, 10))
    }

    setIsLoadingFriendExpenses(false)
  }

  const saveEditPerson = (id: string) => {
    if (!editingPersonName.trim()) return
    setPeople(people.map(p => p.id === id ? { ...p, name: editingPersonName } : p))
    setEditingPersonId(null)
  }

  const addExpense = () => {
    if (!newExpenseName.trim() || !newExpenseAmount || !newExpensePaidBy || newExpenseSplitWith.length === 0) {
      return
    }

    const amount = parseFloat(newExpenseAmount)
    const splitData: Record<string, number> = {}
    const splitCount = newExpenseSplitWith.length
    const perPerson = amount / splitCount

    newExpenseSplitWith.forEach(personId => {
      splitData[personId] = perPerson
    })

    // Update interaction dates for friends involved in this expense
    const allInvolvedPersonIds = [...new Set([newExpensePaidBy, ...newExpenseSplitWith])]
    allInvolvedPersonIds.forEach(personId => {
      // Check if this person ID matches a friend ID
      const friend = friends.find(f => f.id === personId)
      if (friend) {
        updateFriendInteraction(personId)
      }
    })

    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        name: newExpenseName,
        amount,
        paidBy: newExpensePaidBy,
        splitWith: newExpenseSplitWith,
        splitType: 'equal',
        splitData,
        date: new Date().toISOString().split('T')[0],
      },
    ])
    setNewExpenseName('')
    setNewExpenseAmount('')
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

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const startEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id)
    setEditValues({ name: expense.name, amount: expense.amount.toString() })
  }

  const saveEditExpense = (id: string) => {
    if (!editValues.name.trim() || !editValues.amount) return

    setExpenses(expenses.map(e =>
      e.id === id
        ? { ...e, name: editValues.name, amount: parseFloat(editValues.amount) }
        : e
    ))
    setEditingExpenseId(null)
  }

  const getExpenseTotals = () => {
    const totals: Record<string, { paid: number; owes: number }> = {}
    people.forEach(p => {
      totals[p.id] = { paid: 0, owes: 0 }
    })

    expenses.forEach(expense => {
      totals[expense.paidBy].paid += expense.amount
      const splitAmount = expense.amount / expense.splitWith.length
      expense.splitWith.forEach(personId => {
        totals[personId].owes += splitAmount
      })
    })

    return totals
  }

  const handleReceiptUpload = () => {
    const dummyExpenses = [
      { id: '1', name: 'Burger Meal', amount: 250 },
      { id: '2', name: 'Grilled Fish', amount: 450 },
      { id: '3', name: 'Soft Drinks (2x)', amount: 150 },
      { id: '4', name: 'Dessert Platter', amount: 200 },
    ]
    setReceiptExpenses(dummyExpenses.map(e => ({ ...e, paidByPersonId: null })))
    setShowReceiptScanner(true)
  }

  const setReceiptExpensePaidBy = (expenseId: string, personId: string) => {
    setReceiptExpenses(receiptExpenses.map(e =>
      e.id === expenseId ? { ...e, paidByPersonId: personId } : e
    ))
  }

  const editReceiptExpense = (expenseId: string, name: string, amount: number) => {
    setReceiptExpenses(receiptExpenses.map(e =>
      e.id === expenseId ? { ...e, name, amount } : e
    ))
  }

  const removeReceiptExpense = (expenseId: string) => {
    setReceiptExpenses(receiptExpenses.filter(e => e.id !== expenseId))
  }

  const confirmReceiptExpenses = () => {
    if (receiptExpenses.some(e => !e.paidByPersonId)) {
      alert('Please select who paid for each item')
      return
    }

    const newExpenses = receiptExpenses.map(item => ({
      id: Date.now().toString() + Math.random(),
      name: item.name,
      amount: item.amount,
      paidBy: item.paidByPersonId!,
      splitWith: newExpenseSplitWith,
      splitType: 'equal' as const,
      splitData: {},
      date: new Date().toISOString().split('T')[0],
    }))

    // Update interaction dates for friends involved in receipt expenses
    const allInvolvedPersonIds = new Set<string>()
    newExpenses.forEach(expense => {
      allInvolvedPersonIds.add(expense.paidBy)
      expense.splitWith.forEach(personId => allInvolvedPersonIds.add(personId))
    })
    allInvolvedPersonIds.forEach(personId => {
      const friend = friends.find(f => f.id === personId)
      if (friend) {
        updateFriendInteraction(personId)
      }
    })

    setExpenses([...expenses, ...newExpenses])
    setShowReceiptScanner(false)
    setReceiptExpenses([])
  }

  const mockFriends = [
    { id: 'f1', name: 'Alice Johnson' },
    { id: 'f2', name: 'Bob Smith' },
    { id: 'f3', name: 'Charlie Davis' },
  ]

  const calculateSettlements = () => {
    const balances: Record<string, number> = {}
    people.forEach(p => {
      balances[p.id] = 0
    })

    expenses.forEach(expense => {
      const perPersonShare = expense.amount / expense.splitWith.length
      expense.splitWith.forEach(personId => {
        if (personId !== expense.paidBy) {
          balances[personId] -= perPersonShare
        }
      })
      balances[expense.paidBy] += expense.amount - (expense.splitWith.includes(expense.paidBy) ? perPersonShare : 0)
    })

    const settlements: Array<{ from: string; to: string; amount: number }> = []
    
    // Create arrays of debtors (negative balance) and creditors (positive balance)
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < -0.01)
      .map(([id, balance]) => ({ id, balance: Math.abs(balance) }))
      .sort((a, b) => b.balance - a.balance) // Sort by largest debt first
    
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 0.01)
      .map(([id, balance]) => ({ id, balance }))
      .sort((a, b) => b.balance - a.balance) // Sort by largest credit first

    // Greedy algorithm: match largest debtor with largest creditor
    let debtorIndex = 0
    let creditorIndex = 0

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex]
      const creditor = creditors[creditorIndex]

      // Skip if same person (shouldn't happen, but safety check)
      if (debtor.id === creditor.id) {
        creditorIndex++
        continue
      }

      const settleAmount = Math.min(debtor.balance, creditor.balance)
      
      if (settleAmount > 0.01) {
        settlements.push({
          from: debtor.id,
          to: creditor.id,
          amount: settleAmount,
        })

        debtor.balance -= settleAmount
        creditor.balance -= settleAmount

        // Move to next debtor if fully settled
        if (debtor.balance < 0.01) {
          debtorIndex++
        }

        // Move to next creditor if fully settled
        if (creditor.balance < 0.01) {
          creditorIndex++
        }
      } else {
        break
      }
    }

    return settlements
  }

  const settlements = calculateSettlements()

  const getPersonName = (id: string) => {
    return people.find(p => p.id === id)?.name || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-foreground text-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-background">
          split
        </Link>
        <nav className="flex items-center gap-6">
          <select
            value={currencyCode}
            onChange={(e) => {
              const code = e.target.value
              setCurrencyCode(code)
              const symbols: Record<string, string> = {
                'PHP': '₱',
                'USD': '$',
                'EUR': '€',
                'GBP': '£',
                'JPY': '¥',
                'INR': '₹',
              }
              setCurrency(symbols[code] || code)
            }}
            className="bg-transparent text-sm text-background/70 outline-none border-none cursor-pointer hover:text-background transition-colors"
          >
            <option value="PHP">₱ PHP</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
            <option value="JPY">¥ JPY</option>
            <option value="INR">₹ INR</option>
          </select>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-background/40 transition-colors hover:text-background"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {isLoggedIn && (
            <>
              <button
                onClick={() => setShowAddFriendsModal(true)}
                className="p-2 text-background/40 transition-colors hover:text-background"
                title="add friends"
              >
                <UserPlus className="h-4 w-4" />
              </button>
              <Link
                href="/dashboard"
                className="text-sm text-background/70 transition-colors hover:text-background"
              >
                dashboard
              </Link>
            </>
          )}
          {isLoggedIn ? (
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-sm text-background/70 transition-colors hover:text-background"
            >
              logout
            </button>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm text-background/70 transition-colors hover:text-background"
              >
                sign in
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-16 lg:grid-cols-2">
          {/* People Section */}
          <div>
            <h2 className="text-2xl font-bold text-background mb-8">people</h2>
            <div className="space-y-3 mb-6">
              {people.map(person => {
                const personIsFriend = isFriend(person.id)
                return (
                  <div key={person.id} className="group flex items-center justify-between">
                    {editingPersonId === person.id && !personIsFriend ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          autoFocus
                          type="text"
                          value={editingPersonName}
                          onChange={(e) => setEditingPersonName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEditPerson(person.id)}
                          className="flex-1 bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
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
                        {personIsFriend ? (
                          <button
                            onClick={() => handleFriendClick(person.id, person.name)}
                            className="text-xl font-bold text-background text-left cursor-pointer hover:opacity-70 transition underline decoration-background/30 hover:decoration-background"
                          >
                            {person.name}
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditPerson(person)}
                            className="text-xl font-bold text-background text-left cursor-pointer hover:opacity-70 transition"
                          >
                            {person.name}
                          </button>
                        )}
                        {people.length > 1 && (
                          <button
                            onClick={() => removePerson(person.id)}
                            className="text-background/40 hover:text-background transition opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="add person"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyPress={handlePersonInputKeyPress}
                  onFocus={() => {
                    setIsPersonInputFocused(true)
                  }}
                  onBlur={() => {
                    setIsPersonInputFocused(false)
                    // Delay closing to allow click on suggestion
                    setTimeout(() => setShowFriendSuggestions(false), 200)
                  }}
                  className="flex-1 bg-transparent text-lg text-background outline-none border-b-2 border-background/30 placeholder:text-background/40 focus:border-background"
                />
                <button
                  onClick={() => addPerson()}
                  className="w-10 h-10 flex items-center justify-center text-2xl font-bold opacity-50 hover:opacity-100 transition"
                >
                  +
                </button>
              </div>

              {/* Friend Suggestions Dropdown */}
              {showFriendSuggestions && filteredFriends.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-foreground border border-background/20 z-10 max-h-48 overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
                >
                  {filteredFriends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        addPerson(friend.id, friend.name)
                      }}
                      className="w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition border-b border-background/20 last:border-b-0"
                    >
                      {friend.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Expense Section */}
          <div>
            <h2 className="text-2xl font-bold text-background mb-8">add expense</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">what</h3>
                <input
                  type="text"
                  placeholder="dinner"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 placeholder:text-background/40 focus:border-background"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">amount</h3>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  step="0.01"
                  className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 placeholder:text-background/40 focus:border-background"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">paid by</h3>
                <select
                  value={newExpensePaidBy}
                  onChange={(e) => setNewExpensePaidBy(e.target.value)}
                  className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                >
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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
                    <span>{newExpenseSplitWith.length === people.length ? 'all' : `${newExpenseSplitWith.length} selected`}</span>
                    <span className="text-background/40">▼</span>
                  </button>
                  {splitDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-foreground border border-background/20 z-10">
                      <button
                        onClick={() => selectAllSplitWith()}
                        className="w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition border-b border-background/20"
                      >
                        select all
                      </button>
                      {people.map(person => (
                        <label key={person.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background/5 transition cursor-pointer border-b border-background/20 last:border-b-0">
                          <input
                            type="checkbox"
                            checked={newExpenseSplitWith.includes(person.id)}
                            onChange={() => toggleSplitWith(person.id)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-base text-background flex-1">{person.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={addExpense}
                  className={`w-full border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground ${ENABLE_RECEIPT_SCANNER ? 'flex-1' : 'w-full'}`}
                >
                  add expense
                </button>
                {ENABLE_RECEIPT_SCANNER && (
                  <button
                    onClick={handleReceiptUpload}
                    className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                  >
                    scan receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Scanner Modal */}
        {showReceiptScanner && ENABLE_RECEIPT_SCANNER && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowReceiptScanner(false)}>
            <div className="w-full max-w-lg border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-background mb-8">receipt items</h2>
              <div className="space-y-6 mb-8">
                {receiptExpenses.map(item => (
                  <div key={item.id} className="space-y-3 pb-6 border-b border-background/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-lg text-background">{item.name}</p>
                        <p className="text-background/50 font-medium mt-1">{currency}{item.amount.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeReceiptExpense(item.id)}
                        className="text-background/40 hover:text-background transition opacity-50 hover:opacity-100"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setReceiptDropdownOpen(receiptDropdownOpen === item.id ? null : item.id)}
                        className="w-full text-left bg-transparent border-b-2 border-background/30 py-3 text-base text-background outline-none focus:border-background flex justify-between items-center"
                      >
                        <span>{item.paidByPersonId ? people.find(p => p.id === item.paidByPersonId)?.name : 'select who paid'}</span>
                        <span className="text-background/40">▼</span>
                      </button>
                      {receiptDropdownOpen === item.id && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-foreground border border-background/20 z-10">
                          {people.map(person => (
                            <button
                              key={person.id}
                              onClick={() => {
                                setReceiptExpensePaidBy(item.id, person.id)
                                setReceiptDropdownOpen(null)
                              }}
                              className="w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition border-b border-background/20 last:border-b-0"
                            >
                              {person.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReceiptScanner(false)
                    setReceiptExpenses([])
                  }}
                  className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                >
                  cancel
                </button>
                <button
                  onClick={confirmReceiptExpenses}
                  className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        {expenses.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-background mb-8">expenses</h2>
            <div className="space-y-4">
              {expenses.map(expense => (
                <div
                  key={expense.id}
                  onClick={() => startEditExpense(expense)}
                  className="group cursor-pointer flex items-center justify-between border-b border-background/20 pb-4 hover:opacity-70 transition"
                >
                  {editingExpenseId === expense.id ? (
                    <>
                      <div className="flex-1 space-y-3">
                        <input
                          autoFocus
                          type="text"
                          value={editValues.name}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.amount}
                            onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              saveEditExpense(expense.id)
                            }}
                            className="font-medium text-sm text-background/70 hover:text-background transition-colors"
                          >
                            save
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xl font-bold text-background">{expense.name}</p>
                        <p className="text-sm text-background/50 mt-1">
                          {getPersonName(expense.paidBy)} paid · {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl font-bold text-background">{currency}{expense.amount.toFixed(2)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeExpense(expense.id)
                          }}
                          className="text-background/40 hover:text-background transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Table */}
        {expenses.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-background mb-8">summary</h2>
            <div className="space-y-4">
              {people.map(person => {
                const totals = getExpenseTotals()
                const personTotals = totals[person.id]
                const balance = personTotals.paid - personTotals.owes
                return (
                  <div key={person.id} className="flex items-center justify-between border-b border-background/20 pb-4">
                    <p className="font-bold text-lg text-background">{person.name}</p>
                    <div className="flex gap-12 text-lg font-bold text-background">
                      <span>paid: {currency}{personTotals.paid.toFixed(2)}</span>
                      <span>owes: {currency}{personTotals.owes.toFixed(2)}</span>
                      <span className={balance > 0.01 ? 'text-green-500' : balance < -0.01 ? 'text-red-500' : 'text-background/50'}>
                        balance: {currency}{balance.toFixed(2)}
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
            <h2 className="text-2xl font-bold text-background mb-8">settlements</h2>
            <div className="space-y-4">
              {settlements.map((settlement, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-background/20 pb-4">
                  <p className="font-bold text-lg text-background">
                    <span>{getPersonName(settlement.from)}</span>
                    <span className="text-background/50"> pays </span>
                    <span>{getPersonName(settlement.to)}</span>
                  </p>
                  <p className="text-2xl font-bold text-background">{currency}{settlement.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>

      {/* Add Friends Modal */}
      {showAddFriendsModal && !isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowAddFriendsModal(false)}>
          <div className="w-full max-w-lg border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-background mb-4">add friends</h2>
            <p className="text-sm text-background/50 mb-6">sign in to add friends</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddFriendsModal(false)}
                className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
              >
                cancel
              </button>
              <Link
                href="/auth/signin"
                className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground text-center"
              >
                sign in
              </Link>
            </div>
          </div>
        </div>
      )}

      {showAddFriendsModal && isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowAddFriendsModal(false)}>
          <div className="w-full max-w-lg border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-background mb-6">add friends</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-8">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    if (!people.find(p => p.id === friend.id)) {
                      setPeople([...people, { id: friend.id, name: friend.name }])
                      setNewExpenseSplitWith([...newExpenseSplitWith, friend.id])
                    }
                    setShowAddFriendsModal(false)
                  }}
                  className="w-full text-left py-3 px-4 border border-background/20 text-background font-medium text-base transition-colors hover:bg-background/5"
                >
                  {friend.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddFriendsModal(false)}
              className="w-full border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
            >
              close
            </button>
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
                {people.find(p => p.id === selectedFriendId)?.name || 'Friend'}
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
                          {expense.date || 'No date'} • {currency}{expense.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-background/40 mt-1">
                          {expense.paidBy === (people.find(p => p.id === selectedFriendId)?.name) ? 'paid by them' : 'split with them'}
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
