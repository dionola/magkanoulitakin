'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFriends, addFriend, removeFriend } from '@/lib/api'

export function useFriends(enabled: boolean) {
  const queryClient = useQueryClient()
  const friendsQuery = useQuery({
    queryKey: ['friends'],
    enabled,
    queryFn: getFriends,
  })

  const addFriendMutation = useMutation({
    mutationFn: addFriend,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
  const removeFriendMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['friends'] })
      await queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
    },
  })

  return {
    friends: friendsQuery.data ?? [],
    isAddingFriend: addFriendMutation.isPending,
    fetchFriends: async () => {
      await friendsQuery.refetch()
    },
    handleAddFriend: async (email: string) => {
      try {
        await addFriendMutation.mutateAsync(email)
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add friend'
        return { ok: false, error: message }
      }
    },
    handleUnfriend: async (friendId: string) => {
      try {
        await removeFriendMutation.mutateAsync(friendId)
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove friend'
        return { ok: false, error: message }
      }
    },
  }
}
