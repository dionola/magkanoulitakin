import { z } from 'zod'

export const addFriendSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type AddFriendInput = z.infer<typeof addFriendSchema>



