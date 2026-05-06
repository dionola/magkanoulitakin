'use client'

import { useQuery } from '@tanstack/react-query'
import { getPasswordCheck } from '@/lib/api'

export function useUserPassword(enabled: boolean) {
  const query = useQuery({
    queryKey: ['userPassword'],
    enabled,
    queryFn: getPasswordCheck,
  })

  return { hasPassword: query.data?.hasPassword ?? false }
}
