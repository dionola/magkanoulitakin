'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFriends, addFriend, removeFriend } from '@/lib/api'
import type { Friend } from '@/lib/types'

export function useFriends(enabled: boolean) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [isAddingFriend, setIsAddingFriend] = useState(false)

  const fetchFriends = useCallback(async () => {
    if (!enabled) return
    try {
      const data = await getFriends()
      setFriends(data)
    } catch {
      setFriends([])
    }
  }, [enabled])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  const handleAddFriend = useCallback(
    async (email: string) => {
      try {
        setIsAddingFriend(true)
        await addFriend(email)
        await fetchFriends()
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add friend'
        return { ok: false, error: message }
      } finally {
        setIsAddingFriend(false)
      }
    },
    [fetchFriends]
  )

  const handleUnfriend = useCallback(
    async (friendId: string) => {
      try {
        await removeFriend(friendId)
        await fetchFriends()
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove friend'
        return { ok: false, error: message }
      }
    },
    [fetchFriends]
  )

  return { friends, isAddingFriend, fetchFriends, handleAddFriend, handleUnfriend }
}
