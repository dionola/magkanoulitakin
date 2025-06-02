'use client'

import { useState, useEffect } from 'react'
import { getPasswordCheck } from '@/lib/api'

export function useUserPassword(enabled: boolean) {
  const [hasPassword, setHasPassword] = useState(false)

  useEffect(() => {
    if (!enabled) return
    getPasswordCheck()
      .then((data) => setHasPassword(data.hasPassword))
      .catch(() => setHasPassword(false))
  }, [enabled])

  return { hasPassword }
}
