import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import ShareableLink from '@/lib/models/ShareableLink'
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
    await connectDB()
    const body = await req.json()
    const shareLinkId = typeof body.shareLinkId === 'string' ? body.shareLinkId : undefined
    const validatedData = updateTransactionGroupSchema.parse(body)
    const session = await getServerSession(authOptions)
    const User = await import('@/lib/models/User').then(m => m.default)
    const user = session?.user?.email
      ? await User.findOne({ email: session.user.email })
      : null

    const existingExpense = user
      ? await Expense.findOne({
          userId: user._id,
          transactionGroupId: params.id,
        }).lean()
      : null

    if (!existingExpense && shareLinkId) {
      const shareLink = await ShareableLink.findOne({ linkId: shareLinkId, isActive: true }).lean()
      const linkedExpense = shareLink ? await Expense.findById(shareLink.resourceId).lean() : null
      if (!linkedExpense || linkedExpense.transactionGroupId !== params.id) {
        return errorResponse(new Error('Transaction not found'), 'Transaction not found', 404)
      }
    } else if (!existingExpense && !shareLinkId) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
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
