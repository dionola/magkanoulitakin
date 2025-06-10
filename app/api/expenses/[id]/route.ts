import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { updateExpenseSchema } from '@/lib/validations/expense'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const expense = await Expense.findOne({
      _id: params.id,
      userId: user._id,
    }).lean()

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    return successResponse({
      id: expense._id.toString(),
      name: expense.name,
      amount: expense.amount,
      date: expense.date.toISOString().split('T')[0],
      budget: expense.budget,
      paidBy: expense.paidBy,
      splitWith: expense.splitWith,
      type: expense.type,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const cascadeGroup = body.cascadeGroup === true
    const validatedData = updateExpenseSchema.parse(body)
    const existingExpense = await Expense.findOne({
      _id: params.id,
      userId: user._id,
    })

    if (!existingExpense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    const updateDoc = {
      ...validatedData,
      ...(validatedData.date && { date: new Date(validatedData.date) }),
    }

    if (cascadeGroup && existingExpense.transactionGroupId) {
      await Expense.updateMany(
        { transactionGroupId: existingExpense.transactionGroupId },
        updateDoc,
        { runValidators: true }
      )
    } else {
      await Expense.updateOne(
        {
          _id: params.id,
          userId: user._id,
        },
        updateDoc,
        { runValidators: true }
      )
    }

    const expense = await Expense.findOne({
      _id: params.id,
      userId: user._id,
    })

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    return successResponse({
      id: expense._id.toString(),
      name: expense.name,
      amount: expense.amount,
      date: expense.date.toISOString().split('T')[0],
      budget: expense.budget,
      paidBy: expense.paidBy,
      splitWith: expense.splitWith,
      type: expense.type,
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
  { params }: { params: { id: string } }
) {
  try {
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

    const rawBody = await req.text()
    const body = rawBody ? JSON.parse(rawBody) : {}
    const cascadeGroup = body?.cascadeGroup === true

    const expense = await Expense.findOne({
      _id: params.id,
      userId: user._id,
    })

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    if (cascadeGroup && expense.transactionGroupId) {
      const groupedExpenses = await Expense.find({
        transactionGroupId: expense.transactionGroupId,
      }).select('_id')

      await Expense.deleteMany({
        transactionGroupId: expense.transactionGroupId,
      })

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
        userId: user._id,
      })

      try {
        const ShareableLink = await import('@/lib/models/ShareableLink').then(m => m.default)
        await ShareableLink.deleteMany({
          resourceType: 'expense',
          resourceId: expense._id.toString(),
        })
      } catch {
        // Don't fail delete if shareable link cleanup fails
      }
    }

    return successResponse({ message: 'Expense deleted successfully' })
  } catch (error) {
    return errorResponse(error)
  }
}






