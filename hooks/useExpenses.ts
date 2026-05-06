'use client'

import { useQuery } from '@tanstack/react-query'
import { getExpenses, type DateRange } from '@/lib/api'

export function useExpenses(
  dateRange: DateRange,
  customStartDate: string,
  customEndDate: string,
  enabled: boolean
) {
  const query = useQuery({
    queryKey: ['expenses', dateRange, customStartDate, customEndDate],
    enabled,
    queryFn: () =>
      getExpenses({
        dateRange,
        ...(dateRange === 'custom' && customStartDate && customEndDate
          ? { startDate: customStartDate, endDate: customEndDate }
          : {}),
      }),
  })

  return {
    expenses: query.data ?? [],
    isLoading: query.isLoading,
    fetchExpenses: async () => {
      await query.refetch()
    },
  }
}
