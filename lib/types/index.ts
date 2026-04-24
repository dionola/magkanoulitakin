/**
 * Shared types used across frontend and API responses.
 * Single source of truth for Expense, Friend, and related DTOs.
 */

export interface Expense {
  id: string
  name: string
  amount: number
  date: string
  budget?: string
  category?: string
  paidBy: string
  splitWith: string[]
  type: 'expense' | 'settlement'
  sharedExpenseId?: string
  transactionGroupId?: string
  transactionGroupName?: string
  shareLinkId?: string
}

export interface Friend {
  id: string
  name: string
  email: string
  image?: string
}

export interface TransactionGroup {
  id: string
  name: string
  expenses: Expense[]
  totalAmount: number
  date: string
  participants: string[]
}

export interface FriendRequest {
  id: string
  user: { id: string; name: string; email: string; image?: string }
  status: string
  createdAt: string
}

export interface UserMe {
  id: string
  name: string | null
  email: string
  image?: string | null
}

export interface PasswordCheck {
  hasPassword: boolean
}

/** Calculator-only: person with id/name; expenses use person id for paidBy/splitWith */
export interface Person {
  id: string
  name: string
}

/** Calculator expense shape for settlement math */
export interface CalculatorExpense {
  id: string
  name: string
  amount: number
  category?: string
  paidBy: string
  splitWith: string[]
  splitType: 'equal' | 'percentage' | 'exact'
  splitData: Record<string, number>
  sharedExpenseId?: string
  transactionGroupId?: string
  transactionGroupName?: string
  shareLinkId?: string
}
