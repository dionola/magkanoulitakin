import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { errorResponse, successResponse } from '@/lib/utils/errors'

const updateTransactionGroupSchema = z.object({
  transactionGroupName: z.string().trim().min(1, 'Transaction name is required'),
})

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
    }

    await connectDB()
    const User = await import('@/lib/models/User').then(m => m.default)
    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    const body = await req.json()
    const validatedData = updateTransactionGroupSchema.parse(body)

    const existingExpense = await Expense.findOne({
      userId: user._id,
      transactionGroupId: params.id,
    }).lean()

    if (!existingExpense) {
      return errorResponse(new Error('Transaction not found'), 'Transaction not found', 404)
    }

    await Expense.updateMany(
      { transactionGroupId: params.id },
      { transactionGroupName: validatedData.transactionGroupName },
      { runValidators: true }
    )

    return successResponse({
      transactionGroupId: params.id,
      transactionGroupName: validatedData.transactionGroupName,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}
