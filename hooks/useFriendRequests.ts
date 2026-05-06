'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFriendRequests, acceptFriendRequest } from '@/lib/api'

export function useFriendRequests(enabled: boolean) {
  const queryClient = useQueryClient()
  const requestsQuery = useQuery({
    queryKey: ['friendRequests'],
    enabled,
    queryFn: getFriendRequests,
  })

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      await queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })

  return {
    friendRequests: requestsQuery.data ?? [],
    fetchFriendRequests: async () => {
      await requestsQuery.refetch()
    },
    handleAccept: async (requestId: string) => {
      try {
        await acceptMutation.mutateAsync(requestId)
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept friend request'
        return { ok: false, error: message }
      }
    },
  }
}
