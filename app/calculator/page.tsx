'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Trash2, Plus, Moon, Sun, LogOut, LogIn, UserPlus, X, Share2, ChevronDown, Utensils, Plane, ShoppingBag, Receipt, Film, Heart, GraduationCap, Car, Home, MoreHorizontal, Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { calculateSettlements as calculateSettlementsUtil } from '@/lib/utils/settlements'

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
  category?: string
  transactionGroupId?: string
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
  const [editingRecurringExpenseId, setEditingRecurringExpenseId] = useState<string | null>(null)
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)
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
  const [isSavingExpenses, setIsSavingExpenses] = useState(false)
  // Track the current session group ID for expenses added in the same session
  // Expenses added before saving will share the same transactionGroupId
  const [currentSessionGroupId, setCurrentSessionGroupId] = useState<string | null>(null)
  const splitDropdownRef = useRef<HTMLDivElement>(null)
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [defaultCategory, setDefaultCategory] = useState<string>('')
  const [newExpenseDate, setNewExpenseDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCategoryGrid, setShowCategoryGrid] = useState(false)
  const [expenseType, setExpenseType] = useState<'expense' | 'recurring-expense' | 'income'>('expense')
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'weekly' | 'daily' | 'custom'>('monthly')
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState('')
  const [incomeFrequency, setIncomeFrequency] = useState<'one-time' | 'monthly' | 'weekly' | 'bi-weekly' | 'daily' | 'custom'>('monthly')
  const [incomeDayOfMonth, setIncomeDayOfMonth] = useState('')
  const [incomeDayOfWeek, setIncomeDayOfWeek] = useState('')
  const [incomeSpecificDays, setIncomeSpecificDays] = useState('')
  const categoryGridRef = useRef<HTMLDivElement>(null)
  const [showExpenseTypeMenu, setShowExpenseTypeMenu] = useState(false)
  const expenseTypeMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemType, setEditingItemType] = useState<'expense' | 'recurring-expense' | 'income' | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareableResource, setShareableResource] = useState<{ type: 'expense' | 'recurring-expense', id: string } | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [recurringExpenses, setRecurringExpenses] = useState<Array<{
    id: string
    name: string
    amount: number
    category?: string
    frequency: 'monthly' | 'weekly' | 'daily'
    dayOfMonth?: number
    dayOfWeek?: number
  }>>([])
  const [incomes, setIncomes] = useState<Array<{
    id: string
    name: string
    amount: number
    frequency: 'one-time' | 'monthly' | 'weekly' | 'bi-weekly' | 'daily'
    dayOfMonth?: number
    dayOfWeek?: number
    specificDays?: number[]
  }>>([])
  const ENABLE_RECEIPT_SCANNER = false

  // Default expense categories
  const expenseCategories = [
    'food',
    'travel',
    'shopping',
    'bills',
    'entertainment',
    'health',
    'education',
    'transport',
    'housing',
    'other'
  ]

  // Category icon mapping
  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'food': Utensils,
    'travel': Plane,
    'shopping': ShoppingBag,
    'bills': Receipt,
    'entertainment': Film,
    'health': Heart,
    'education': GraduationCap,
    'transport': Car,
    'housing': Home,
    'other': MoreHorizontal
  }

  // Check if single person mode (just logging expenses)
  const isSinglePersonMode = people.length === 1

  // Check if a person is a friend
  const isFriend = (personId: string) => {
    return friends.some(f => f.id === personId)
  }

  // Close split dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (splitDropdownRef.current && !splitDropdownRef.current.contains(event.target as Node)) {
        setSplitDropdownOpen(false)
      }
      if (categoryGridRef.current && !categoryGridRef.current.contains(event.target as Node)) {
        setShowCategoryGrid(false)
      }
    }

    if (splitDropdownOpen || showCategoryGrid) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [splitDropdownOpen, showCategoryGrid])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (expenseTypeMenuTimeoutRef.current) {
        clearTimeout(expenseTypeMenuTimeoutRef.current)
      }
    }
  }, [])

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
      fetchRecurringExpenses()
      fetchIncomes()
    }
  }, [isLoggedIn])

  const fetchRecurringExpenses = async () => {
    try {
      const response = await fetch('/api/recurring-expenses')
      if (response.ok) {
        const data = await response.json()
        setRecurringExpenses(data)
      }
    } catch (error) {
      console.error('Failed to fetch recurring expenses:', error)
    }
  }

  const fetchIncomes = async () => {
    try {
      const response = await fetch('/api/income')
      if (response.ok) {
        const data = await response.json()
        setIncomes(data)
      }
    } catch (error) {
      console.error('Failed to fetch income:', error)
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

  const addExpense = async () => {
    if (!newExpenseName.trim() || !newExpenseAmount) {
      return
    }

    const amount = parseFloat(newExpenseAmount)

    // Handle update case
    if (editingItemId && editingItemType) {
      if (editingItemType === 'expense' && expenseType === 'expense') {
        if (!newExpensePaidBy || newExpenseSplitWith.length === 0) {
          return
        }

        if (isLoggedIn && editingItemId.startsWith('api-')) {
          try {
            const paidByName = getPersonName(newExpensePaidBy)
            const splitWithNames = newExpenseSplitWith.map(id => getPersonName(id))
            const expenseId = editingItemId.replace('api-', '')

            const response = await fetch(`/api/expenses/${expenseId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: newExpenseName,
                amount,
                date: newExpenseDate.toISOString().split('T')[0],
                category: newExpenseCategory || defaultCategory || undefined,
                paidBy: paidByName,
                splitWith: splitWithNames,
              }),
            })

            if (response.ok) {
              // Update local state
              setExpenses(expenses.map(e =>
                e.id === editingItemId
                  ? {
                    ...e,
                    name: newExpenseName,
                    amount,
                    paidBy: newExpensePaidBy,
                    splitWith: newExpenseSplitWith,
                    category: newExpenseCategory || defaultCategory || undefined,
                    date: newExpenseDate.toISOString().split('T')[0],
                  }
                  : e
              ))
              // Reset form
              setEditingItemId(null)
              setEditingItemType(null)
              setNewExpenseName('')
              setNewExpenseAmount('')
              setNewExpenseCategory('')
              setNewExpenseDate(new Date())
              setNewExpensePaidBy(people[0]?.id || '')
              setNewExpenseSplitWith(people.map(p => p.id))
            }
          } catch (error) {
            console.error('Failed to update expense:', error)
          }
        } else {
          // Update local expense
          setExpenses(expenses.map(e =>
            e.id === editingItemId
              ? {
                ...e,
                name: newExpenseName,
                amount,
                paidBy: newExpensePaidBy,
                splitWith: newExpenseSplitWith,
                category: newExpenseCategory || defaultCategory || undefined,
                date: newExpenseDate.toISOString().split('T')[0],
              }
              : e
          ))
          setEditingItemId(null)
          setEditingItemType(null)
          setNewExpenseName('')
          setNewExpenseAmount('')
          setNewExpenseCategory('')
          setNewExpenseDate(new Date())
          setNewExpensePaidBy(people[0]?.id || '')
          setNewExpenseSplitWith(people.map(p => p.id))
        }
        return
      } else if (editingItemType === 'recurring-expense' && expenseType === 'recurring-expense') {
        try {
          const response = await fetch(`/api/recurring-expenses/${editingItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newExpenseName,
              amount,
              category: newExpenseCategory || defaultCategory || undefined,
              frequency: recurringFrequency === 'custom' ? 'monthly' : recurringFrequency,
              dayOfWeek: recurringFrequency === 'weekly' && recurringDayOfWeek ? parseInt(recurringDayOfWeek) : undefined,
            }),
          })
          if (response.ok) {
            await fetchRecurringExpenses()
            setEditingItemId(null)
            setEditingItemType(null)
            setNewExpenseName('')
            setNewExpenseAmount('')
            setNewExpenseCategory('')
            setRecurringFrequency('monthly')
            setRecurringDayOfWeek('')
          }
        } catch (error) {
          console.error('Failed to update recurring expense:', error)
        }
        return
      } else if (editingItemType === 'income' && expenseType === 'income') {
        try {
          const response = await fetch(`/api/income/${editingItemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newExpenseName,
              amount,
              frequency: incomeFrequency === 'custom' ? 'monthly' : incomeFrequency,
              dayOfWeek: incomeFrequency === 'weekly' && incomeDayOfWeek ? parseInt(incomeDayOfWeek) : undefined,
              specificDays: incomeFrequency === 'custom' && incomeSpecificDays
                ? incomeSpecificDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
                : undefined,
            }),
          })
          if (response.ok) {
            await fetchIncomes()
            setEditingItemId(null)
            setEditingItemType(null)
            setNewExpenseName('')
            setNewExpenseAmount('')
            setIncomeFrequency('monthly')
            setIncomeDayOfWeek('')
            setIncomeSpecificDays('')
          }
        } catch (error) {
          console.error('Failed to update income:', error)
        }
        return
      }
    }

    // Handle create case
    if (expenseType === 'expense') {
      if (!newExpensePaidBy || newExpenseSplitWith.length === 0) {
        return
      }

      const splitData: Record<string, number> = {}
      const splitCount = newExpenseSplitWith.length
      const perPerson = amount / splitCount

      newExpenseSplitWith.forEach(personId => {
        splitData[personId] = perPerson
      })

      // Update interaction dates for friends involved in this expense
      const allInvolvedPersonIds = [...new Set([newExpensePaidBy, ...newExpenseSplitWith])]
      allInvolvedPersonIds.forEach(personId => {
        const friend = friends.find(f => f.id === personId)
        if (friend) {
          updateFriendInteraction(personId)
        }
      })

      const categoryToUse = newExpenseCategory || defaultCategory

      // Generate session group ID for expenses added in the same session
      // Expenses added before saving will be grouped together when displayed
      // If there are no unsaved expenses, start a new session group
      // Otherwise, use the existing session group ID to keep them together
      let sessionGroupId = currentSessionGroupId
      const hasUnsavedExpenses = expenses.some(e => !e.id.startsWith('api-'))

      if (!hasUnsavedExpenses) {
        // All expenses are saved, start a new session group for the next batch
        sessionGroupId = `session-${Date.now()}`
        setCurrentSessionGroupId(sessionGroupId)
      } else if (!sessionGroupId) {
        // There are unsaved expenses but no session group - create one
        // This handles edge cases where session group might be lost
        sessionGroupId = `session-${Date.now()}`
        setCurrentSessionGroupId(sessionGroupId)
      }
      // If hasUnsavedExpenses and sessionGroupId exists, use the existing one

      // Add expense locally (no auto-save)
      // Expenses are only saved when the user explicitly clicks the "save expenses" button
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
          date: newExpenseDate.toISOString().split('T')[0],
          category: categoryToUse || undefined,
          transactionGroupId: sessionGroupId || undefined,
        },
      ])

      setNewExpenseName('')
      setNewExpenseAmount('')
      setNewExpenseCategory(defaultCategory)
      setNewExpenseDate(new Date())
      setNewExpensePaidBy(people[0]?.id || '')
      setNewExpenseSplitWith(people.map(p => p.id))
    } else if (expenseType === 'recurring-expense' && isLoggedIn) {
      try {
        const response = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newExpenseName,
            amount,
            category: newExpenseCategory || defaultCategory || undefined,
            frequency: recurringFrequency === 'custom' ? 'monthly' : recurringFrequency,
            dayOfWeek: recurringFrequency === 'weekly' && recurringDayOfWeek ? parseInt(recurringDayOfWeek) : undefined,
            startDate: new Date().toISOString().split('T')[0],
          }),
        })
        if (response.ok) {
          // Shareable link is auto-created on the server
          await fetchRecurringExpenses()
          setNewExpenseName('')
          setNewExpenseAmount('')
          setNewExpenseCategory(defaultCategory)
        }
      } catch (error) {
        console.error('Failed to save recurring expense:', error)
      }
    } else if (expenseType === 'income' && isLoggedIn) {
      try {
        const response = await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newExpenseName,
            amount,
            frequency: incomeFrequency === 'custom' ? 'monthly' : incomeFrequency,
            dayOfWeek: incomeFrequency === 'weekly' && incomeDayOfWeek ? parseInt(incomeDayOfWeek) : undefined,
            specificDays: incomeFrequency === 'custom' && incomeSpecificDays
              ? incomeSpecificDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
              : undefined,
            startDate: new Date().toISOString().split('T')[0],
          }),
        })
        if (response.ok) {
          await fetchIncomes()
          setNewExpenseName('')
          setNewExpenseAmount('')
        }
      } catch (error) {
        console.error('Failed to save income:', error)
      }
    }
  }

  const saveExpensesToAPI = async () => {
    if (!isLoggedIn || expenses.length === 0) {
      return
    }

    setIsSavingExpenses(true)
    try {
      // Get expenses that haven't been saved yet (those without a saved flag or API ID)
      const unsavedExpenses = expenses.filter(e => !e.id.startsWith('api-'))

      if (unsavedExpenses.length === 0) {
        setIsSavingExpenses(false)
        return
      }

      // Save each expense to the API
      const savePromises = unsavedExpenses.map(async (expense) => {
        const paidByName = getPersonName(expense.paidBy)
        const splitWithNames = expense.splitWith.map(id => getPersonName(id))

        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: expense.name,
            amount: expense.amount,
            date: expense.date || new Date().toISOString().split('T')[0],
            category: expense.category,
            paidBy: paidByName,
            splitWith: splitWithNames,
            type: 'expense',
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to save expense: ${expense.name}`)
        }

        const savedExpense = await response.json()
        // Shareable link is auto-created on the server
        return { localId: expense.id, savedId: savedExpense.id }
      })

      const results = await Promise.all(savePromises)

      // Update expenses with API IDs, preserving transactionGroupId
      // This ensures expenses added in the same session remain grouped after saving
      setExpenses(prevExpenses => {
        const updated = prevExpenses.map(expense => {
          const result = results.find(r => r.localId === expense.id)
          if (result) {
            return { ...expense, id: `api-${result.savedId}` }
          }
          return expense
        })

        // Reset session group ID if all expenses are now saved
        // This allows the next batch of expenses to start a new session group
        const allSaved = updated.every(e => e.id.startsWith('api-'))
        if (allSaved) {
          setCurrentSessionGroupId(null)
        }

        return updated
      })

      alert(`Successfully saved ${results.length} expense(s)`)
    } catch (error) {
      console.error('Failed to save expenses:', error)
      alert('Failed to save expenses. Please try again.')
    } finally {
      setIsSavingExpenses(false)
    }
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
    // Only allow editing one item at a time
    if (editingRecurringExpenseId || editingIncomeId) {
      return
    }
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
    // Use the utility function to ensure consistency with tests
    return calculateSettlementsUtil(people, expenses)
  }

  const settlements = calculateSettlements()

  const getPersonName = (id: string) => {
    return people.find(p => p.id === id)?.name || 'Unknown'
  }

  // Load expense into form for editing
  const loadExpenseIntoForm = (expense: Expense) => {
    setEditingItemId(expense.id)
    setEditingItemType('expense')
    setExpenseType('expense')
    setNewExpenseName(expense.name)
    setNewExpenseAmount(expense.amount.toString())
    setNewExpenseCategory(expense.category || '')
    setNewExpensePaidBy(expense.paidBy)
    setNewExpenseSplitWith(expense.splitWith)
    // Scroll to form
    setTimeout(() => {
      document.querySelector('[data-expense-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Load recurring expense into form for editing
  const loadRecurringExpenseIntoForm = (recurring: typeof recurringExpenses[0]) => {
    setEditingItemId(recurring.id)
    setEditingItemType('recurring-expense')
    setExpenseType('recurring-expense')
    setNewExpenseName(recurring.name)
    setNewExpenseAmount(recurring.amount.toString())
    setNewExpenseCategory(recurring.category || '')
    setRecurringFrequency(recurring.frequency === 'monthly' ? 'monthly' : recurring.frequency === 'weekly' ? 'weekly' : 'daily')
    if (recurring.dayOfWeek !== undefined) {
      setRecurringDayOfWeek(recurring.dayOfWeek.toString())
    }
    // Scroll to form
    setTimeout(() => {
      document.querySelector('[data-expense-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // Load income into form for editing
  const loadIncomeIntoForm = (income: typeof incomes[0]) => {
    setEditingItemId(income.id)
    setEditingItemType('income')
    setExpenseType('income')
    setNewExpenseName(income.name)
    setNewExpenseAmount(income.amount.toString())
    setIncomeFrequency(income.frequency)
    if (income.dayOfWeek !== undefined) {
      setIncomeDayOfWeek(income.dayOfWeek.toString())
    }
    if (income.specificDays && income.specificDays.length > 0) {
      setIncomeSpecificDays(income.specificDays.join(', '))
    }
    // Scroll to form
    setTimeout(() => {
      document.querySelector('[data-expense-form]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
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
            <Link
              href="/dashboard"
              className="text-sm text-background/70 transition-colors hover:text-background"
            >
              dashboard
            </Link>
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
          <div data-expense-form>
            <div
              className="relative mb-8"
              onMouseEnter={() => {
                if (isLoggedIn) {
                  if (expenseTypeMenuTimeoutRef.current) {
                    clearTimeout(expenseTypeMenuTimeoutRef.current)
                    expenseTypeMenuTimeoutRef.current = null
                  }
                  setShowExpenseTypeMenu(true)
                }
              }}
              onMouseLeave={() => {
                if (isLoggedIn) {
                  // Add delay before closing
                  expenseTypeMenuTimeoutRef.current = setTimeout(() => {
                    setShowExpenseTypeMenu(false)
                  }, 200)
                }
              }}
            >
              <div className="flex items-center justify-between text-2xl font-bold text-background pb-2">
                <span>{editingItemId ? 'edit' : 'add'} {expenseType === 'expense' ? 'expense' : expenseType === 'recurring-expense' ? 'recurring expense' : 'income'}</span>
                <div className="flex items-center gap-2">
                  {editingItemId && (
                    <button
                      onClick={() => {
                        setEditingItemId(null)
                        setEditingItemType(null)
                        setNewExpenseName('')
                        setNewExpenseAmount('')
                        setNewExpenseCategory('')
                        setNewExpenseDate(new Date())
                        setNewExpensePaidBy(people[0]?.id || '')
                        setNewExpenseSplitWith(people.map(p => p.id))
                        setExpenseType('expense')
                        setRecurringFrequency('monthly')
                        setRecurringDayOfWeek('')
                        setIncomeFrequency('monthly')
                        setIncomeDayOfWeek('')
                        setIncomeSpecificDays('')
                      }}
                      className="text-sm text-background/50 hover:text-background transition-colors"
                    >
                      cancel
                    </button>
                  )}
                  {isLoggedIn && !editingItemId && (
                    <ChevronDown className="h-5 w-5 text-background/50 transition-colors" />
                  )}
                </div>
              </div>
              {/* Expense Type Menu - Show on hover with delay */}
              {isLoggedIn && showExpenseTypeMenu && (
                <div className="absolute top-full left-0 mt-2 bg-foreground border border-background/20 z-20 min-w-[200px]">
                  <div className="py-2">
                    {expenseType !== 'expense' && (
                      <button
                        onClick={() => {
                          setExpenseType('expense')
                          setShowExpenseTypeMenu(false)
                        }}
                        className="w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition border-b border-background/20"
                      >
                        expense
                      </button>
                    )}
                    {expenseType !== 'recurring-expense' && (
                      <button
                        onClick={() => {
                          setExpenseType('recurring-expense')
                          setShowExpenseTypeMenu(false)
                        }}
                        className={`w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition ${expenseType !== 'expense' ? 'border-b border-background/20' : ''}`}
                      >
                        recurring
                      </button>
                    )}
                    {expenseType !== 'income' && (
                      <button
                        onClick={() => {
                          setExpenseType('income')
                          setShowExpenseTypeMenu(false)
                        }}
                        className="w-full text-left px-4 py-3 font-medium text-base text-background hover:bg-background/5 transition"
                      >
                        income
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Extended hover area with padding - makes hover more forgiving */}
              {isLoggedIn && (
                <div className="absolute -top-4 -bottom-4 -left-8 -right-8 z-10" />
              )}
            </div>
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

              {expenseType === 'expense' && (
                <div>
                  <h3 className="text-sm font-medium text-background/50 mb-2">date</h3>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background text-left pb-2 flex justify-between items-center"
                      >
                        <span>{format(newExpenseDate, 'PPP')}</span>
                        <CalendarIcon className="h-5 w-5 text-background/50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newExpenseDate}
                        onSelect={(date) => {
                          if (date) {
                            setNewExpenseDate(date)
                            if (editingItemId && editingItemType === 'expense') {
                              setExpenses(expenses.map(e =>
                                e.id === editingItemId ? { ...e, date: date.toISOString().split('T')[0] } : e
                              ))
                            }
                            setShowDatePicker(false)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {expenseType === 'expense' && !isSinglePersonMode && (
                <>
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
                    <h3 className="text-sm font-medium text-background/50 mb-2">split between</h3>
                    <div className="relative" ref={splitDropdownRef}>
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
                </>
              )}

              <div className="relative" ref={categoryGridRef}>
                <h3 className="text-sm font-medium text-background/50 mb-2">category</h3>
                <button
                  onClick={() => setShowCategoryGrid(!showCategoryGrid)}
                  className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background text-left pb-2 flex justify-between items-center"
                >
                  <span className="flex items-center gap-2">
                    {newExpenseCategory || defaultCategory ? (
                      <>
                        {(() => {
                          const Icon = categoryIcons[newExpenseCategory || defaultCategory]
                          return Icon ? <Icon className="h-5 w-5" /> : null
                        })()}
                        <span className="capitalize">{newExpenseCategory || defaultCategory}</span>
                      </>
                    ) : (
                      'select category'
                    )}
                  </span>
                  <span className="text-background/40">▼</span>
                </button>
                {showCategoryGrid && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-foreground border border-background/20 z-10 p-4">
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          setNewExpenseCategory('')
                          setDefaultCategory('')
                          setShowCategoryGrid(false)
                        }}
                        className="flex flex-col items-center gap-2 p-3 border border-background/20 hover:bg-background/5 transition"
                      >
                        <MoreHorizontal className="h-6 w-6 text-background/50" />
                        <span className="text-xs text-background/70">none</span>
                      </button>
                      {expenseCategories.map(cat => {
                        const Icon = categoryIcons[cat]
                        const isSelected = (newExpenseCategory || defaultCategory) === cat
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              setNewExpenseCategory(cat)
                              setDefaultCategory(cat)
                              setShowCategoryGrid(false)
                            }}
                            className={`flex flex-col items-center gap-2 p-3 border transition ${isSelected
                              ? 'border-background bg-background/10'
                              : 'border-background/20 hover:bg-background/5'
                              }`}
                          >
                            {Icon && <Icon className={`h-6 w-6 ${isSelected ? 'text-background' : 'text-background/70'}`} />}
                            <span className={`text-xs capitalize ${isSelected ? 'text-background' : 'text-background/70'}`}>
                              {cat}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring Expense Fields */}
              {expenseType === 'recurring-expense' && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-background/50 mb-2">frequency</h3>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value as 'monthly' | 'weekly' | 'daily' | 'custom')}
                      className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                    >
                      <option value="monthly">monthly</option>
                      <option value="weekly">weekly</option>
                      <option value="daily">daily</option>
                      <option value="custom">custom</option>
                    </select>
                  </div>
                  {recurringFrequency === 'weekly' && (
                    <div>
                      <h3 className="text-sm font-medium text-background/50 mb-2">day of week</h3>
                      <select
                        value={recurringDayOfWeek}
                        onChange={(e) => setRecurringDayOfWeek(e.target.value)}
                        className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                      >
                        <option value="">select</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Income Fields */}
              {expenseType === 'income' && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-background/50 mb-2">frequency</h3>
                    <select
                      value={incomeFrequency}
                      onChange={(e) => setIncomeFrequency(e.target.value as 'one-time' | 'monthly' | 'weekly' | 'bi-weekly' | 'daily' | 'custom')}
                      className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                    >
                      <option value="one-time">one-time</option>
                      <option value="monthly">monthly</option>
                      <option value="weekly">weekly</option>
                      <option value="bi-weekly">bi-weekly</option>
                      <option value="daily">daily</option>
                      <option value="custom">custom</option>
                    </select>
                  </div>
                  {incomeFrequency === 'weekly' && (
                    <div>
                      <h3 className="text-sm font-medium text-background/50 mb-2">day of week</h3>
                      <select
                        value={incomeDayOfWeek}
                        onChange={(e) => setIncomeDayOfWeek(e.target.value)}
                        className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                      >
                        <option value="">select</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                  )}
                  {incomeFrequency === 'custom' && (
                    <div>
                      <h3 className="text-sm font-medium text-background/50 mb-2">specific days (comma-separated, e.g., 1,15,30)</h3>
                      <input
                        type="text"
                        value={incomeSpecificDays}
                        onChange={(e) => setIncomeSpecificDays(e.target.value)}
                        placeholder="1, 15, 30"
                        className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 placeholder:text-background/40 focus:border-background"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={addExpense}
                  className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  {editingItemId ? 'update' : 'add'} {expenseType === 'expense' ? 'expense' : expenseType === 'recurring-expense' ? 'recurring expense' : 'income'}
                </button>
                {isLoggedIn && expenses.length > 0 && (
                  <button
                    onClick={saveExpensesToAPI}
                    disabled={isSavingExpenses}
                    className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingExpenses ? 'saving...' : 'save expenses'}
                  </button>
                )}
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

        {/* Recent Items Section - Show based on selected expenseType */}
        {isLoggedIn && (
          <div className="mt-16">
            {expenseType === 'expense' && expenses.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-background mb-8">recent expenses</h2>
                <div className="space-y-4">
                  {(() => {
                    // Filter to only show saved expenses (those with api- prefix) and exclude the current expense being edited
                    // Unsaved expenses will not appear in recent expenses until they are explicitly saved
                    const filteredExpenses = expenses.filter(e => e.id.startsWith('api-') && e.id !== editingItemId)

                    // Group expenses by transactionGroupId
                    const groups = new Map<string, Expense[]>()
                    const ungrouped: Expense[] = []

                    filteredExpenses.forEach(expense => {
                      if (expense.transactionGroupId) {
                        if (!groups.has(expense.transactionGroupId)) {
                          groups.set(expense.transactionGroupId, [])
                        }
                        groups.get(expense.transactionGroupId)!.push(expense)
                      } else {
                        ungrouped.push(expense)
                      }
                    })

                    // Create grouped items
                    const groupedItems: Array<{ type: 'group' | 'single', expenses: Expense[], groupId?: string }> = []

                    // Add groups
                    groups.forEach((groupExpenses, groupId) => {
                      groupedItems.push({ type: 'group', expenses: groupExpenses, groupId })
                    })

                    // Add ungrouped expenses
                    ungrouped.forEach(expense => {
                      groupedItems.push({ type: 'single', expenses: [expense] })
                    })

                    // Sort by date (most recent first)
                    groupedItems.sort((a, b) => {
                      const dateA = a.expenses[0].date ? new Date(a.expenses[0].date).getTime() : 0
                      const dateB = b.expenses[0].date ? new Date(b.expenses[0].date).getTime() : 0
                      return dateB - dateA
                    })

                    return groupedItems.slice(0, 10).map((item, idx) => {
                      if (item.type === 'group') {
                        const totalAmount = item.expenses.reduce((sum, e) => sum + e.amount, 0)
                        const allParticipants = new Set<string>()
                        item.expenses.forEach(e => {
                          allParticipants.add(e.paidBy)
                          e.splitWith.forEach(p => allParticipants.add(p))
                        })

                        return (
                          <div key={`group-${item.groupId}`} className="border-b border-background/20 pb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-lg font-bold text-background">expense group</p>
                                <p className="text-sm text-background/50 mt-1">
                                  {item.expenses[0].date && new Date(item.expenses[0].date).toLocaleDateString()} · {item.expenses.length} {item.expenses.length === 1 ? 'expense' : 'expenses'}
                                  {!isSinglePersonMode && ` · ${Array.from(allParticipants).map(id => getPersonName(id)).join(', ')}`}
                                </p>
                              </div>
                              <p className="text-2xl font-bold text-background">{currency}{totalAmount.toFixed(2)}</p>
                            </div>
                            <div className="mt-3 space-y-2 pl-4 border-l-2 border-background/20">
                              {item.expenses.map(expense => {
                                const isBigExpense = expense.amount > 1000
                                const isExpanded = expandedExpenseId === expense.id
                                return (
                                  <div
                                    key={expense.id}
                                    className={`pb-2 ${isBigExpense ? 'cursor-pointer' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (isBigExpense) {
                                        setExpandedExpenseId(isExpanded ? null : expense.id)
                                      } else {
                                        loadExpenseIntoForm(expense)
                                      }
                                    }}
                                  >
                                    {editingItemId === expense.id && editingItemType === 'expense' ? (
                                      <div className="text-sm text-background/50">
                                        editing in form above
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="text-base font-bold text-background">{expense.name}</p>
                                            <p className="text-xs text-background/50 mt-1">
                                              {expense.category && <span className="capitalize">{expense.category}</span>}
                                              {!isSinglePersonMode && (
                                                <>
                                                  {expense.category && ' · '}
                                                  {getPersonName(expense.paidBy)} paid · {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}
                                                </>
                                              )}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <p className="text-xl font-bold text-background">{currency}{expense.amount.toFixed(2)}</p>
                                            {isBigExpense && (
                                              <ChevronDown className={`h-4 w-4 text-background/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            )}
                                          </div>
                                        </div>
                                        {isExpanded && (
                                          <div className="mt-2 pt-2 border-t border-background/10 space-y-1">
                                            <p className="text-xs text-background/70">
                                              <span className="font-medium">Date:</span> {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
                                            </p>
                                            {expense.category && (
                                              <p className="text-xs text-background/70">
                                                <span className="font-medium">Category:</span> <span className="capitalize">{expense.category}</span>
                                              </p>
                                            )}
                                            {!isSinglePersonMode && (
                                              <>
                                                <p className="text-xs text-background/70">
                                                  <span className="font-medium">Paid by:</span> {getPersonName(expense.paidBy)}
                                                </p>
                                                <p className="text-xs text-background/70">
                                                  <span className="font-medium">Split with:</span> {expense.splitWith.map(id => getPersonName(id)).join(', ')}
                                                </p>
                                              </>
                                            )}
                                            <div className="flex gap-2 mt-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  loadExpenseIntoForm(expense)
                                                }}
                                                className="text-xs text-background/70 hover:text-background transition-colors"
                                              >
                                                edit
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  removeExpense(expense.id)
                                                }}
                                                className="text-xs text-background/70 hover:text-background transition-colors"
                                              >
                                                delete
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      } else {
                        // Single expense
                        const expense = item.expenses[0]
                        const isBigExpense = expense.amount > 1000
                        const isExpanded = expandedExpenseId === expense.id
                        return (
                          <div
                            key={expense.id}
                            className={`border-b border-background/20 pb-4 ${isBigExpense ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (isBigExpense) {
                                setExpandedExpenseId(isExpanded ? null : expense.id)
                              } else {
                                loadExpenseIntoForm(expense)
                              }
                            }}
                          >
                            {editingItemId === expense.id && editingItemType === 'expense' ? (
                              <div className="text-sm text-background/50">
                                editing in form above
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-xl font-bold text-background">{expense.name}</p>
                                    <p className="text-sm text-background/50 mt-1">
                                      {expense.date && new Date(expense.date).toLocaleDateString()} · {expense.category && <span className="capitalize">{expense.category}</span>}
                                      {!isSinglePersonMode && (
                                        <>
                                          {expense.category && ' · '}
                                          {getPersonName(expense.paidBy)} paid · {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}
                                        </>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="text-2xl font-bold text-background">{currency}{expense.amount.toFixed(2)}</p>
                                    {isBigExpense && (
                                      <ChevronDown className={`h-5 w-5 text-background/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    )}
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div className="mt-4 pt-4 border-t border-background/20 space-y-2">
                                    <p className="text-sm text-background/70">
                                      <span className="font-medium">Date:</span> {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
                                    </p>
                                    {expense.category && (
                                      <p className="text-sm text-background/70">
                                        <span className="font-medium">Category:</span> <span className="capitalize">{expense.category}</span>
                                      </p>
                                    )}
                                    {!isSinglePersonMode && (
                                      <>
                                        <p className="text-sm text-background/70">
                                          <span className="font-medium">Paid by:</span> {getPersonName(expense.paidBy)}
                                        </p>
                                        <p className="text-sm text-background/70">
                                          <span className="font-medium">Split with:</span> {expense.splitWith.map(id => getPersonName(id)).join(', ')}
                                        </p>
                                      </>
                                    )}
                                    <div className="flex gap-2 mt-4">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          loadExpenseIntoForm(expense)
                                        }}
                                        className="text-sm text-background/70 hover:text-background transition-colors"
                                      >
                                        edit
                                      </button>
                                      {expense.id.startsWith('api-') && (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            try {
                                              const response = await fetch(`/api/shareable-links?resourceType=expense&resourceId=${expense.id.replace('api-', '')}`)
                                              if (response.ok) {
                                                const data = await response.json()
                                                if (data.length > 0) {
                                                  const link = `${window.location.origin}/share/${data[0].linkId}`
                                                  navigator.clipboard.writeText(link)
                                                  alert('Shareable link copied to clipboard!')
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Failed to fetch link:', error)
                                            }
                                          }}
                                          className="text-sm text-background/70 hover:text-background transition-colors"
                                        >
                                          share
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removeExpense(expense.id)
                                        }}
                                        className="text-sm text-background/70 hover:text-background transition-colors"
                                      >
                                        delete
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      }
                    })
                  })()}
                </div>
              </div>
            )}

            {expenseType === 'recurring-expense' && recurringExpenses.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-background mb-8">recurring expenses</h2>
                <div className="space-y-4">
                  {recurringExpenses.slice(0, 10).map(recurring => (
                    <div
                      key={recurring.id}
                      className="border-b border-background/20 pb-4 cursor-pointer"
                      onClick={() => {
                        loadRecurringExpenseIntoForm(recurring)
                      }}
                    >
                      {editingItemId === recurring.id && editingItemType === 'recurring-expense' ? (
                        <div className="text-sm text-background/50">
                          editing in form above
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xl font-bold text-background">{recurring.name}</p>
                            <p className="text-sm text-background/50 mt-1">
                              {recurring.frequency} · {recurring.category && <span className="capitalize">{recurring.category}</span>}
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-background">{currency}{recurring.amount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expenseType === 'income' && incomes.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-background mb-8">income</h2>
                <div className="space-y-4">
                  {incomes.slice(0, 10).map(income => (
                    <div
                      key={income.id}
                      className="border-b border-background/20 pb-4 cursor-pointer"
                      onClick={() => {
                        loadIncomeIntoForm(income)
                      }}
                    >
                      {editingItemId === income.id && editingItemType === 'income' ? (
                        <div className="text-sm text-background/50">
                          editing in form above
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xl font-bold text-background">{income.name}</p>
                            <p className="text-sm text-background/50 mt-1">
                              {income.frequency}
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-background">{currency}{income.amount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-background">expenses</h2>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-transparent text-sm text-background/70 outline-none border-b-2 border-background/30 focus:border-background"
              >
                <option value="all">all categories</option>
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-4">
              {expenses
                .filter(expense => selectedCategoryFilter === 'all' || expense.category === selectedCategoryFilter)
                .map(expense => (
                  <div
                    key={expense.id}
                    onClick={() => {
                      // Only allow editing if no other items are being edited
                      if (!editingRecurringExpenseId && !editingIncomeId) {
                        startEditExpense(expense)
                      }
                    }}
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
                            {!isSinglePersonMode && (
                              <>
                                {getPersonName(expense.paidBy)} paid · {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}
                                {expense.category && ' · '}
                              </>
                            )}
                            {expense.category && <span className="capitalize">{expense.category}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-2xl font-bold text-background">{currency}{expense.amount.toFixed(2)}</p>
                          {isLoggedIn && expense.id.startsWith('api-') && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                // Fetch existing shareable link or create new one
                                try {
                                  const response = await fetch(`/api/shareable-links?resourceType=expense&resourceId=${expense.id.replace('api-', '')}`)
                                  if (response.ok) {
                                    const data = await response.json()
                                    if (data.length > 0) {
                                      // Link exists, show it
                                      const link = `${window.location.origin}/share/${data[0].linkId}`
                                      navigator.clipboard.writeText(link)
                                      alert('Shareable link copied to clipboard!')
                                    } else {
                                      // No link exists yet (shouldn't happen with auto-creation, but handle it)
                                      setShareableResource({ type: 'expense', id: expense.id.replace('api-', '') })
                                      setShowShareModal(true)
                                    }
                                  } else {
                                    // Fallback to modal
                                    setShareableResource({ type: 'expense', id: expense.id.replace('api-', '') })
                                    setShowShareModal(true)
                                  }
                                } catch (error) {
                                  // Fallback to modal
                                  setShareableResource({ type: 'expense', id: expense.id.replace('api-', '') })
                                  setShowShareModal(true)
                                }
                              }}
                              className="text-background/40 hover:text-background transition opacity-0 group-hover:opacity-100"
                              title="share expense"
                            >
                              <Share2 className="h-5 w-5" />
                            </button>
                          )}
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
        {expenses.length > 0 && !isSinglePersonMode && (
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
        {settlements.length > 0 && !isSinglePersonMode && (
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


      {/* Share Modal */}
      {showShareModal && shareableResource && (
        <ShareModal
          resourceType={shareableResource.type}
          resourceId={shareableResource.id}
          friends={friends}
          onClose={() => {
            setShowShareModal(false)
            setShareableResource(null)
            setGeneratedLink(null)
          }}
          onLinkGenerated={(link) => {
            setGeneratedLink(link)
          }}
        />
      )}
    </div>
  )
}

// Share Modal Component
function ShareModal({ resourceType, resourceId, friends, onClose, onLinkGenerated }: {
  resourceType: 'expense' | 'recurring-expense'
  resourceId: string
  friends: Array<{ id: string; name: string }>
  onClose: () => void
  onLinkGenerated: (link: string) => void
}) {
  const [password, setPassword] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true)
      const response = await fetch('/api/shareable-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType,
          resourceId,
          password: password || undefined,
          allowedFriendIds: selectedFriends,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const link = `${window.location.origin}/share/${data.linkId}`
        setGeneratedLink(link)
        onLinkGenerated(link)
      }
    } catch (error) {
      console.error('Failed to generate link:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-lg border border-background bg-foreground p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-background">share {resourceType === 'expense' ? 'expense' : 'recurring expense'}</h2>
          <button onClick={onClose} className="text-background/40 hover:text-background transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {generatedLink ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-background/50 mb-2">shareable link</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-background outline-none border-b-2 border-background/30"
                />
                <button
                  onClick={copyToClipboard}
                  className="border-2 border-background/30 px-4 py-2 text-sm font-medium text-background/70 transition-colors hover:border-background hover:text-background"
                >
                  copy
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground"
            >
              done
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleGenerateLink() }} className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-background/50 mb-2">password (optional)</h3>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-lg text-background outline-none border-b-2 border-background/30 focus:border-background"
                placeholder="leave empty for no password"
              />
              <p className="text-xs text-background/40 mt-1">friends can access without password</p>
            </div>

            {friends.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-background/50 mb-2">allow friends (optional)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {friends.map(friend => (
                    <label key={friend.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFriends([...selectedFriends, friend.id])
                          } else {
                            setSelectedFriends(selectedFriends.filter(id => id !== friend.id))
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-base text-background">{friend.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-background/30 py-3 text-base font-medium text-background/70 transition-colors hover:border-background hover:text-background"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 border-2 border-background py-3 text-base font-medium text-background transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                {isGenerating ? 'generating...' : 'generate link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

