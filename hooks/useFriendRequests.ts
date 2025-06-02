'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFriendRequests, acceptFriendRequest } from '@/lib/api'
import type { FriendRequest } from '@/lib/types'

export function useFriendRequests(enabled: boolean) {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])

  const fetchFriendRequests = useCallback(async () => {
    if (!enabled) return
    try {
      const data = await getFriendRequests()
      setFriendRequests(data)
    } catch {
      setFriendRequests([])
    }
  }, [enabled])

  useEffect(() => {
    fetchFriendRequests()
  }, [fetchFriendRequests])

  const handleAccept = useCallback(
    async (requestId: string) => {
      try {
        await acceptFriendRequest(requestId)
        await fetchFriendRequests()
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept friend request'
        return { ok: false, error: message }
      }
    },
    [fetchFriendRequests]
  )

  return { friendRequests, fetchFriendRequests, handleAccept }
}
