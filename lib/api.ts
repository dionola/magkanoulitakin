/**
 * Shared API client. All fetch calls to /api/* should go through this module
 * for consistent error handling and typing.
 */

import type { Expense, Friend, FriendRequest, UserMe, PasswordCheck } from '@/lib/types'

const API_BASE = ''

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> }
): Promise<T> {
  const { params, ...init } = options ?? {}
  const url = params
    ? `${API_BASE}${path}?${new URLSearchParams(params).toString()}`
    : `${API_BASE}${path}`

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Request failed'
    throw new ApiError(message, response.status, data)
  }
  return data as T
}

// --- Expenses ---
export type DateRange = 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'

export function getExpenses(options: {
  dateRange: DateRange
  startDate?: string
  endDate?: string
}): Promise<Expense[]> {
  const params: Record<string, string> = { dateRange: options.dateRange }
  if (options.startDate) params.startDate = options.startDate
  if (options.endDate) params.endDate = options.endDate
  return request<Expense[]>(`/api/expenses`, { params })
}

export function createExpense(body: {
  name: string
  amount: number
  date: string
  paidBy: string
  splitWith: string[]
  budget?: string
  category?: string
  type?: 'expense' | 'settlement'
  sharedExpenseId?: string
  transactionGroupId?: string
  transactionGroupName?: string
  sharedParticipantIds?: string[]
  shareLinkId?: string
}): Promise<Expense> {
  return request<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getExpense(id: string, options?: { shareLinkId?: string }): Promise<Expense> {
  return request<Expense>(`/api/expenses/${id}`, options?.shareLinkId ? {
    params: { shareLinkId: options.shareLinkId },
  } : undefined)
}

export function updateExpense(
  id: string,
  body: Partial<{ name: string; amount: number; date: string; paidBy: string; splitWith: string[]; budget?: string; category?: string; transactionGroupName?: string }> & {
    cascadeGroup?: boolean
    shareLinkId?: string
  }
): Promise<Expense> {
  return request<Expense>(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteExpense(id: string, options?: { cascadeGroup?: boolean; shareLinkId?: string }): Promise<void> {
  return request(`/api/expenses/${id}`, {
    method: 'DELETE',
    ...(options ? { body: JSON.stringify(options) } : {}),
  })
}

export function updateTransactionGroupName(
  transactionGroupId: string,
  body: { transactionGroupName: string; shareLinkId?: string }
): Promise<{ transactionGroupId: string; transactionGroupName: string }> {
  return request(`/api/transaction-groups/${transactionGroupId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getShareableTransaction(linkId: string): Promise<{
  linkId: string
  transactionGroupId?: string
  transactionGroupName?: string
  expenses: Expense[]
}> {
  return request(`/api/shareable-links/${linkId}/transaction`)
}

// --- Friends ---
export function getFriends(): Promise<Friend[]> {
  return request<Friend[]>('/api/friends')
}

export function addFriend(email: string): Promise<Friend> {
  return request<Friend>('/api/friends', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function removeFriend(friendId: string): Promise<void> {
  return request(`/api/friends/${friendId}`, { method: 'DELETE' })
}

// --- Friend requests ---
export function getFriendRequests(): Promise<FriendRequest[]> {
  return request<FriendRequest[]>('/api/friends/requests')
}

export function acceptFriendRequest(requestId: string): Promise<unknown> {
  return request('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })
}

// --- User ---
export function getMe(): Promise<UserMe> {
  return request<UserMe>('/api/users/me')
}

export function updateMe(body: { name: string }): Promise<UserMe> {
  return request<UserMe>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getPasswordCheck(): Promise<PasswordCheck> {
  return request<PasswordCheck>('/api/users/password')
}

export function updatePassword(body: { currentPassword: string; newPassword: string }): Promise<unknown> {
  return request('/api/users/password', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteAccount(): Promise<void> {
  return request('/api/users/delete', { method: 'DELETE' })
}

// --- Shareable links (by id) ---
export function getShareableLink(linkId: string): Promise<{
  linkId: string
  resourceType: string
  resourceId: string
  hasPassword: boolean
  requiresPassword: boolean
  resource?: unknown
}> {
  return request(`/api/shareable-links/${linkId}`)
}

export function authenticateShareableLink(
  linkId: string,
  password: string
): Promise<{ authenticated: boolean; resource: unknown }> {
  return request(`/api/shareable-links/${linkId}`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}
