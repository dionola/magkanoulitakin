import { z } from 'zod'

export const createExpenseSchema = z.object({
  name: z.string().min(1, 'Expense name is required'),
  amount: z.number().positive('Amount must be positive'),
  date: z.string().or(z.date()),
  budget: z.string().optional(),
  paidBy: z.string().min(1, 'Paid by is required'),
  splitWith: z.array(z.string()).min(1, 'At least one person must be included in split'),
  type: z.enum(['expense', 'settlement']).default('expense'),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>

