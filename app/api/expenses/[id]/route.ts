import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import ShareableLink from '@/lib/models/ShareableLink'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { updateExpenseSchema } from '@/lib/validations/expense'

function buildLegacySharedExpenseQuery(expense: {
  transactionGroupId?: string
  transactionGroupName?: string
  name: string
  amount: number
  date: Date
  category?: string
  paidBy: string
  splitWith: string[]
  type: 'expense' | 'settlement'
}) {
  return {
    transactionGroupId: expense.transactionGroupId,
    name: expense.name,
    amount: expense.amount,
    date: expense.date,
    category: expense.category,
    paidBy: expense.paidBy,
    splitWith: expense.splitWith,
    type: expense.type,
  }
}

async function resolveAuthorizedExpenseAccess(expenseId: string, shareLinkId?: string) {
  const session = await getServerSession(authOptions)
  const User = await import('@/lib/models/User').then(m => m.default)
  const user = session?.user?.email
    ? await User.findOne({ email: session.user.email })
    : null

  if (user) {
    const expense = await Expense.findOne({ _id: expenseId, userId: user._id })
    return { expense, user }
  }

  if (!shareLinkId) {
    return { expense: null, user: null }
  }

  const shareLink = await ShareableLink.findOne({ linkId: shareLinkId, isActive: true })
  if (!shareLink) {
    return { expense: null, user: null }
  }

  const linkedExpense = await Expense.findById(shareLink.resourceId)
  if (!linkedExpense) {
    return { expense: null, user: null }
  }

  const expense = await Expense.findById(expenseId)
  if (!expense) {
    return { expense: null, user: null }
  }

  const sameTransaction = linkedExpense.transactionGroupId
    ? expense.transactionGroupId === linkedExpense.transactionGroupId
    : expense._id.toString() === linkedExpense._id.toString()

  return { expense: sameTransaction ? expense : null, user: null }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    await connectDB()
    const shareLinkId = new URL(req.url).searchParams.get('shareLinkId') || undefined
    const { expense } = await resolveAuthorizedExpenseAccess(params.id, shareLinkId)

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    const shareLink = await ShareableLink.findOne({
      resourceType: 'expense',
      resourceId: expense._id.toString(),
      isActive: true,
    }).lean()

    return successResponse({
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
      shareLinkId: shareLink?.linkId,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    await connectDB()

    const body = await req.json()
    const shareLinkId = typeof body.shareLinkId === 'string' ? body.shareLinkId : undefined
    const cascadeGroup = body.cascadeGroup === true
    const validatedData = updateExpenseSchema.parse(body)
    const { expense: existingExpense, user } = await resolveAuthorizedExpenseAccess(params.id, shareLinkId)

    if (!existingExpense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    const updateDoc = {
      ...validatedData,
      ...(validatedData.date && { date: new Date(validatedData.date) }),
    }

    if (cascadeGroup && (existingExpense.sharedExpenseId || existingExpense.transactionGroupId)) {
      const sharedQuery = existingExpense.sharedExpenseId
        ? { sharedExpenseId: existingExpense.sharedExpenseId }
        : buildLegacySharedExpenseQuery(existingExpense)

      await Expense.updateMany(
        sharedQuery,
        updateDoc,
        { runValidators: true }
      )
    } else {
      await Expense.updateOne(
        {
          _id: params.id,
          ...(user ? { userId: user._id } : {}),
        },
        updateDoc,
        { runValidators: true }
      )
    }

    const expense = await Expense.findById(params.id)

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    const shareLink = await ShareableLink.findOne({
      resourceType: 'expense',
      resourceId: expense._id.toString(),
      isActive: true,
    }).lean()

    return successResponse({
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
      shareLinkId: shareLink?.linkId,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params

    await connectDB()

    const rawBody = await req.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const shareLinkId = typeof body?.shareLinkId === 'string' ? body.shareLinkId : undefined
    const cascadeGroup = body?.cascadeGroup === true

    const { expense, user } = await resolveAuthorizedExpenseAccess(params.id, shareLinkId)

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    if (cascadeGroup && (expense.sharedExpenseId || expense.transactionGroupId)) {
      const sharedQuery = expense.sharedExpenseId
        ? { sharedExpenseId: expense.sharedExpenseId }
        : buildLegacySharedExpenseQuery(expense)

      const groupedExpenses = await Expense.find(sharedQuery).select('_id')

      await Expense.deleteMany(sharedQuery)

      try {
        const ShareableLink = await import('@/lib/models/ShareableLink').then(m => m.default)
        await ShareableLink.deleteMany({
          resourceType: 'expense',
          resourceId: { $in: groupedExpenses.map(groupedExpense => groupedExpense._id.toString()) },
        })
      } catch {
        // Don't fail delete if shareable link cleanup fails
      }
    } else {
      await Expense.deleteOne({
        _id: params.id,
        ...(user ? { userId: user._id } : {}),
      })

      await ShareableLink.deleteMany({
        resourceType: 'expense',
        resourceId: expense._id.toString(),
      })
    }

    return successResponse({ message: 'Expense deleted successfully' })
  } catch (error) {
    return errorResponse(error)
  }
}






