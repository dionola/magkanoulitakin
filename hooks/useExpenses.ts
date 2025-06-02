'use client'

import { useState, useEffect, useCallback } from 'react'
import { getExpenses, type DateRange } from '@/lib/api'
import type { Expense } from '@/lib/types'

export function useExpenses(
  dateRange: DateRange,
  customStartDate: string,
  customEndDate: string,
  enabled: boolean
) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    if (!enabled) return
    try {
      setIsLoading(true)
      const data = await getExpenses({
        dateRange,
        ...(dateRange === 'custom' && customStartDate && customEndDate
          ? { startDate: customStartDate, endDate: customEndDate }
          : {}),
      })
      setExpenses(data)
    } catch {
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled, dateRange, customStartDate, customEndDate])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return { expenses, isLoading, fetchExpenses }
}
