import { z } from 'zod'

export const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export const acceptFriendRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
})

export type UpdateNameInput = z.infer<typeof updateNameSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type AcceptFriendRequestInput = z.infer<typeof acceptFriendRequestSchema>
