import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import ShareableLink from '@/lib/models/ShareableLink'
import { errorResponse, successResponse } from '@/lib/utils/errors'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ linkId: string }> }
) {
  try {
    const params = await context.params

    await connectDB()
    const link = await ShareableLink.findOne({ linkId: params.linkId, isActive: true }).lean()

    if (!link) {
      return errorResponse(new Error('Link not found'), 'Link not found', 404)
    }

    const rootExpense = await Expense.findById(link.resourceId).lean()

    if (!rootExpense) {
      return errorResponse(new Error('Resource not found'), 'Resource not found', 404)
    }

    const expenses = await Expense.find(
      rootExpense.transactionGroupId
        ? { transactionGroupId: rootExpense.transactionGroupId }
        : { _id: rootExpense._id }
    )
      .sort({ createdAt: 1 })
      .lean()

    return successResponse({
      linkId: params.linkId,
      transactionGroupId: rootExpense.transactionGroupId,
      transactionGroupName: rootExpense.transactionGroupName,
      expenses: expenses.map(expense => ({
        id: expense._id.toString(),
        name: expense.name,
        amount: expense.amount,
        date: expense.date.toISOString().split('T')[0],
        budget: expense.budget,
        category: expense.category,
        paidBy: expense.paidBy,
        splitWith: expense.splitWith,
        type: expense.type,
        sharedExpenseId: expense.sharedExpenseId,
        transactionGroupId: expense.transactionGroupId,
        transactionGroupName: expense.transactionGroupName,
        shareLinkId: params.linkId,
      })),
    })
  } catch (error) {
    return errorResponse(error)
  }
}
